import os
import shutil
import subprocess
import tempfile
import threading
import time
import zipfile
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk


APP_TITLE = "Auto Zip Folder Installer"
POLL_SECONDS = 3


class AutoZipFolderInstaller(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title(APP_TITLE)
        self.geometry("980x760")
        self.minsize(820, 620)

        self.monitor_folder_var = tk.StringVar()
        self.project_root_var = tk.StringVar()
        self.destination_folder_var = tk.StringVar()
        self.status_var = tk.StringVar(value="Choose a monitor folder, project root, and destination folder.")
        self.monitor_state_var = tk.StringVar(value="Not monitoring.")
        self.detect_mode_var = tk.StringVar(value="auto")
        self.git_commit_enabled_var = tk.BooleanVar(value=True)

        self.is_monitoring = False
        self.monitor_thread = None
        self.stop_event = threading.Event()
        self.processed_zips = set()
        self.processing_zips = set()

        self._build_ui()
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def _build_ui(self):
        main = ttk.Frame(self, padding=12)
        main.pack(fill="both", expand=True)

        title = ttk.Label(main, text=APP_TITLE, font=("Segoe UI", 16, "bold"))
        title.pack(anchor="w", pady=(0, 10))

        monitor_frame = ttk.LabelFrame(main, text="1. Folder to monitor for zip files", padding=10)
        monitor_frame.pack(fill="x", pady=(0, 8))
        ttk.Entry(monitor_frame, textvariable=self.monitor_folder_var).pack(side="left", fill="x", expand=True, padx=(0, 8))
        ttk.Button(monitor_frame, text="Browse Monitor Folder...", command=self.browse_monitor_folder).pack(side="left")

        project_frame = ttk.LabelFrame(main, text="2. Project root / Git repository root", padding=10)
        project_frame.pack(fill="x", pady=(0, 8))
        ttk.Entry(project_frame, textvariable=self.project_root_var).pack(side="left", fill="x", expand=True, padx=(0, 8))
        ttk.Button(project_frame, text="Browse Project Root...", command=self.browse_project_root).pack(side="left")

        destination_frame = ttk.LabelFrame(main, text="3. Destination folder for copied files", padding=10)
        destination_frame.pack(fill="x", pady=(0, 8))
        ttk.Entry(destination_frame, textvariable=self.destination_folder_var).pack(side="left", fill="x", expand=True, padx=(0, 8))
        ttk.Button(destination_frame, text="Browse Destination...", command=self.browse_destination_folder).pack(side="left")

        options_frame = ttk.LabelFrame(main, text="Zip source-root detection", padding=10)
        options_frame.pack(fill="x", pady=(0, 8))
        ttk.Radiobutton(options_frame, text="Auto-detect", value="auto", variable=self.detect_mode_var).pack(side="left")
        ttk.Radiobutton(options_frame, text="Prefer internal src folder", value="src", variable=self.detect_mode_var).pack(side="left", padx=(14, 0))
        ttk.Radiobutton(options_frame, text="Copy whole zip contents", value="whole", variable=self.detect_mode_var).pack(side="left", padx=(14, 0))

        git_frame = ttk.LabelFrame(main, text="Git", padding=10)
        git_frame.pack(fill="x", pady=(0, 8))
        ttk.Checkbutton(
            git_frame,
            text="After a zip installs successfully, commit all repository changes using the zip filename as the commit message",
            variable=self.git_commit_enabled_var,
        ).pack(anchor="w")

        controls = ttk.Frame(main)
        controls.pack(fill="x", pady=(0, 8))
        ttk.Button(controls, text="Start Monitoring", command=self.start_monitoring).pack(side="left")
        ttk.Button(controls, text="Stop Monitoring", command=self.stop_monitoring).pack(side="left", padx=(8, 0))
        ttk.Button(controls, text="Process Existing Zips Now", command=self.process_existing_zips_once).pack(side="left", padx=(8, 0))
        ttk.Button(controls, text="Clear Log", command=self.clear_log).pack(side="left", padx=(8, 0))

        ttk.Label(main, textvariable=self.monitor_state_var, foreground="#555555").pack(anchor="w", pady=(0, 4))
        ttk.Label(main, textvariable=self.status_var, relief="sunken", anchor="w").pack(fill="x", pady=(0, 8))

        log_frame = ttk.LabelFrame(main, text="Log", padding=8)
        log_frame.pack(fill="both", expand=True)
        self.log_box = scrolledtext.ScrolledText(log_frame, wrap="word", font=("Consolas", 10), height=18)
        self.log_box.pack(fill="both", expand=True)

        help_text = (
            "How it works: put a .zip file into the monitor folder. The app waits until the zip stops changing, "
            "extracts it, detects the source root, and copies files into the destination folder. Existing files are overwritten. "
            "No backups are created. If Git commit is enabled, the app runs git add -A and git commit from the project root "
            "after a successful copy."
        )
        ttk.Label(main, text=help_text, wraplength=920, foreground="#555555").pack(anchor="w", pady=(8, 0))

    def browse_monitor_folder(self):
        path = filedialog.askdirectory(title="Select folder to monitor for zip files")
        if path:
            self.monitor_folder_var.set(path)

    def browse_project_root(self):
        path = filedialog.askdirectory(title="Select project root folder")
        if not path:
            return
        project_root = Path(path)
        self.project_root_var.set(str(project_root))
        src_folder = project_root / "src"
        if src_folder.exists() and src_folder.is_dir():
            self.destination_folder_var.set(str(src_folder))
        else:
            self.destination_folder_var.set(str(project_root))

    def browse_destination_folder(self):
        path = filedialog.askdirectory(title="Select destination folder for copied files")
        if path:
            self.destination_folder_var.set(path)
            if not self.project_root_var.get().strip():
                self.project_root_var.set(path)

    def clear_log(self):
        self.log_box.delete("1.0", "end")

    def log(self, message):
        timestamp = datetime.now().strftime("%H:%M:%S")
        self.log_box.insert("end", f"[{timestamp}] {message}\n")
        self.log_box.see("end")

    def log_threadsafe(self, message):
        self.after(0, lambda: self.log(message))

    def set_status_threadsafe(self, message):
        self.after(0, lambda: self.status_var.set(message))

    def set_monitor_state_threadsafe(self, message):
        self.after(0, lambda: self.monitor_state_var.set(message))

    def validate_paths(self):
        monitor_folder = Path(self.monitor_folder_var.get().strip())
        project_root = Path(self.project_root_var.get().strip())
        destination_folder = Path(self.destination_folder_var.get().strip())

        if not monitor_folder.exists() or not monitor_folder.is_dir():
            messagebox.showerror("Missing monitor folder", "Please select a valid folder to monitor.")
            return None, None, None
        if not project_root.exists() or not project_root.is_dir():
            messagebox.showerror("Missing project root", "Please select a valid project root folder.")
            return None, None, None
        if not destination_folder.exists() or not destination_folder.is_dir():
            messagebox.showerror("Missing destination folder", "Please select a valid destination folder.")
            return None, None, None
        if self.git_commit_enabled_var.get() and not (project_root / ".git").exists():
            messagebox.showerror(
                "Project root is not a Git repository",
                "Git commit is enabled, but the selected project root does not contain a .git folder.\n\n"
                "Choose the actual repository root or turn off Git commit.",
            )
            return None, None, None
        return monitor_folder, project_root, destination_folder

    def start_monitoring(self):
        monitor_folder, project_root, destination_folder = self.validate_paths()
        if not monitor_folder:
            return
        if self.is_monitoring:
            messagebox.showinfo("Already monitoring", "The monitor is already running.")
            return
        self.is_monitoring = True
        self.stop_event.clear()
        self.monitor_thread = threading.Thread(
            target=self.monitor_loop,
            args=(monitor_folder, project_root, destination_folder),
            daemon=True,
        )
        self.monitor_thread.start()
        self.monitor_state_var.set(f"Monitoring: {monitor_folder}")
        self.status_var.set("Monitoring started.")
        self.log(f"Started monitoring: {monitor_folder}")
        self.log(f"Project root: {project_root}")
        self.log(f"Destination: {destination_folder}")

    def stop_monitoring(self):
        if not self.is_monitoring:
            self.monitor_state_var.set("Not monitoring.")
            return
        self.is_monitoring = False
        self.stop_event.set()
        self.monitor_state_var.set("Stopping monitor...")
        self.status_var.set("Stopping monitor.")
        self.log("Stopping monitor...")

    def monitor_loop(self, monitor_folder, project_root, destination_folder):
        while not self.stop_event.is_set():
            try:
                self.scan_for_zips(monitor_folder, project_root, destination_folder)
            except Exception as exc:
                self.log_threadsafe(f"Monitor error: {exc}")
                self.set_status_threadsafe("Monitor error. See log.")
            time.sleep(POLL_SECONDS)
        self.set_monitor_state_threadsafe("Not monitoring.")
        self.set_status_threadsafe("Monitoring stopped.")
        self.log_threadsafe("Monitoring stopped.")

    def process_existing_zips_once(self):
        monitor_folder, project_root, destination_folder = self.validate_paths()
        if not monitor_folder:
            return
        self.log(f"Processing existing zip files in: {monitor_folder}")
        self.scan_for_zips(monitor_folder, project_root, destination_folder)
        self.status_var.set("Existing zip scan complete.")

    def scan_for_zips(self, monitor_folder, project_root, destination_folder):
        zip_files = sorted(monitor_folder.glob("*.zip"), key=lambda path: path.stat().st_mtime)
        for zip_path in zip_files:
            zip_key = str(zip_path.resolve())
            if zip_key in self.processed_zips or zip_key in self.processing_zips:
                continue
            if not self.is_zip_ready(zip_path):
                continue
            self.processing_zips.add(zip_key)
            try:
                self.process_zip(zip_path, project_root, destination_folder)
                self.processed_zips.add(zip_key)
            finally:
                self.processing_zips.discard(zip_key)

    def is_zip_ready(self, zip_path):
        try:
            size_1 = zip_path.stat().st_size
            time.sleep(0.6)
            size_2 = zip_path.stat().st_size
            return size_1 > 0 and size_1 == size_2
        except (FileNotFoundError, PermissionError):
            return False

    def process_zip(self, zip_path, project_root, destination_folder):
        self.log_threadsafe(f"Found zip: {zip_path.name}")
        self.set_status_threadsafe(f"Processing {zip_path.name}...")
        extract_dir = Path(tempfile.mkdtemp(prefix="auto_zip_install_"))
        try:
            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                bad_file = zip_ref.testzip()
                if bad_file:
                    raise ValueError(f"Zip appears damaged near: {bad_file}")
                zip_ref.extractall(extract_dir)

            source_root = self.find_source_root(extract_dir)
            if not source_root:
                raise ValueError("Could not detect source root inside zip.")

            copied, overwritten = self.copy_tree(source_root, destination_folder)
            self.log_threadsafe(f"Detected source root: {source_root}")
            self.log_threadsafe(f"Installed {zip_path.name}: copied {copied}, overwritten {overwritten}.")

            if self.git_commit_enabled_var.get():
                commit_message = zip_path.stem
                commit_result = self.commit_repository_changes(project_root, commit_message)
                if commit_result == "committed":
                    self.log_threadsafe(f"Git commit created: {commit_message}")
                    self.set_status_threadsafe(f"Installed and committed {zip_path.name}.")
                elif commit_result == "no_changes":
                    self.log_threadsafe("Git commit skipped: no repository changes detected after copy.")
                    self.set_status_threadsafe(f"Installed {zip_path.name}; no Git changes to commit.")
                else:
                    self.set_status_threadsafe(f"Installed {zip_path.name}; Git commit failed. See log.")
            else:
                self.set_status_threadsafe(f"Installed {zip_path.name}.")
        except Exception as exc:
            self.log_threadsafe(f"FAILED {zip_path.name}: {exc}")
            self.set_status_threadsafe(f"Failed {zip_path.name}. See log.")
        finally:
            try:
                shutil.rmtree(extract_dir)
            except Exception:
                pass

    def find_source_root(self, extract_dir):
        extract_dir = Path(extract_dir)
        mode = self.detect_mode_var.get()
        if mode == "whole":
            return extract_dir
        if mode in ("auto", "src"):
            src_candidates = []
            for root, dirs, files in os.walk(extract_dir):
                root_path = Path(root)
                if root_path.name == "src":
                    src_candidates.append(root_path)
            if src_candidates:
                src_candidates.sort(key=lambda path: len(path.parts))
                return src_candidates[0]
            if mode == "src":
                return None
        if (extract_dir / "games").exists():
            return extract_dir
        children = [child for child in extract_dir.iterdir() if child.is_dir()]
        files = [child for child in extract_dir.iterdir() if child.is_file()]
        if len(children) == 1 and not files:
            single = children[0]
            if (single / "src").exists():
                return single / "src"
            if (single / "games").exists():
                return single
            return single
        source_extensions = {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".json", ".html", ".md", ".txt", ".toml", ".yaml", ".yml"}
        for file_path in extract_dir.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in source_extensions:
                return extract_dir
        return None

    def copy_tree(self, source_root, destination_folder):
        source_root = Path(source_root)
        destination_folder = Path(destination_folder)
        ignored_names = {"__MACOSX", ".DS_Store", "Thumbs.db", ".git", ".venv", "venv", "__pycache__", "node_modules", "dist", "build", ".pytest_cache"}
        copied = 0
        overwritten = 0
        for source_file in source_root.rglob("*"):
            if not source_file.is_file():
                continue
            if any(part in ignored_names for part in source_file.parts):
                continue
            relative_path = source_file.relative_to(source_root)
            destination_file = destination_folder / relative_path
            destination_file.parent.mkdir(parents=True, exist_ok=True)
            if destination_file.exists():
                overwritten += 1
            shutil.copy2(source_file, destination_file)
            copied += 1
        return copied, overwritten

    def commit_repository_changes(self, project_root, commit_message):
        project_root = Path(project_root)

        if not (project_root / ".git").exists():
            self.log_threadsafe(f"Git commit failed: {project_root} is not a Git repository root.")
            return "failed"

        if not shutil.which("git"):
            self.log_threadsafe("Git commit failed: git was not found on PATH.")
            return "failed"

        try:
            status_before_add = self.run_git(project_root, ["status", "--porcelain"])
            if not status_before_add.stdout.strip():
                return "no_changes"

            self.run_git(project_root, ["add", "-A"])

            status_after_add = self.run_git(project_root, ["status", "--porcelain"])
            if not status_after_add.stdout.strip():
                return "no_changes"

            self.run_git(project_root, ["commit", "-m", commit_message])
            return "committed"
        except subprocess.CalledProcessError as exc:
            error_text = (exc.stderr or exc.stdout or str(exc)).strip()
            self.log_threadsafe(f"Git commit failed: {error_text}")
            return "failed"
        except Exception as exc:
            self.log_threadsafe(f"Git commit failed: {exc}")
            return "failed"

    def run_git(self, project_root, args):
        return subprocess.run(
            ["git", *args],
            cwd=project_root,
            text=True,
            capture_output=True,
            check=True,
        )

    def on_close(self):
        if self.is_monitoring:
            proceed = messagebox.askyesno("Monitor is running", "The folder monitor is still running. Stop it and close?")
            if not proceed:
                return
            self.stop_monitoring()
        self.destroy()


def main():
    app = AutoZipFolderInstaller()
    app.mainloop()


if __name__ == "__main__":
    main()
