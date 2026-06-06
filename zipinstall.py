
import os
import shutil
import signal
import subprocess
import tempfile
import threading
import time
import zipfile
import webbrowser
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import filedialog, messagebox, scrolledtext, ttk

APP_TITLE = "Generic Code Zip Installer"

PRESETS = {
    "Vite / Firebase Web App": {
        "dest": "src",
        "run": "npm run dev",
        "build": "npm run build",
        "publish": "npm run build && firebase deploy",
        "url": "http://localhost:5173",
    },
    "Python Project": {
        "dest": "",
        "run": "python main.py",
        "build": "pyinstaller --onefile --windowed main.py",
        "publish": "",
        "url": "",
    },
    "Custom Project": {
        "dest": "",
        "run": "",
        "build": "",
        "publish": "",
        "url": "",
    },
}

IGNORED_NAMES = {
    "__MACOSX", ".DS_Store", "Thumbs.db", ".git", ".venv", "venv",
    "__pycache__", "node_modules", "dist", "build", ".pytest_cache",
}

class GenericCodeZipInstaller(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title(APP_TITLE)
        self.geometry("1180x900")
        self.minsize(940, 720)

        self.preset_var = tk.StringVar(value="Vite / Firebase Web App")
        self.zip_path_var = tk.StringVar()
        self.project_root_var = tk.StringVar()
        self.destination_path_var = tk.StringVar()
        self.run_command_var = tk.StringVar()
        self.build_command_var = tk.StringVar()
        self.publish_command_var = tk.StringVar()
        self.url_var = tk.StringVar()
        self.run_in_cmd_var = tk.BooleanVar(value=True)
        self.git_message_var = tk.StringVar(value="Update project files")

        self.status_var = tk.StringVar(value="Select a project type, zip file, and destination.")
        self.detected_var = tk.StringVar(value="")
        self.run_status_var = tk.StringVar(value="App is not running.")
        self.git_status_var = tk.StringVar(value="Git commands have not run yet.")
        self.build_status_var = tk.StringVar(value="Build/publish has not run yet.")

        self.preview_rows = []
        self.temp_dir = None
        self.source_root = None
        self.run_process = None
        self.run_thread = None

        self._build_ui()
        self.apply_preset()
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def _build_ui(self):
        main = ttk.Frame(self, padding=12)
        main.pack(fill="both", expand=True)

        ttk.Label(main, text=APP_TITLE, font=("Segoe UI", 16, "bold")).pack(anchor="w", pady=(0, 10))

        row = ttk.LabelFrame(main, text="0. Project type", padding=10)
        row.pack(fill="x", pady=(0, 8))
        ttk.Label(row, text="Preset:").pack(side="left")
        combo = ttk.Combobox(row, textvariable=self.preset_var, state="readonly", values=list(PRESETS.keys()), width=24)
        combo.pack(side="left", padx=(6, 10))
        combo.bind("<<ComboboxSelected>>", lambda e: self.apply_preset())
        ttk.Label(row, text="Vite copies into src. Python and Custom copy into the selected destination.", foreground="#555").pack(side="left")

        self._path_row(main, "1. Select downloaded code zip", self.zip_path_var, "Browse Zip...", self.browse_zip, file=True)
        self._path_row(main, "2. Select project root", self.project_root_var, "Browse Project...", self.browse_project)
        self._path_row(main, "3. Destination folder for copied files", self.destination_path_var, "Browse Destination...", self.browse_destination)

        actions = ttk.Frame(main)
        actions.pack(fill="x", pady=(0, 8))
        ttk.Button(actions, text="Preview Files", command=self.preview_zip).pack(side="left")
        ttk.Button(actions, text="Install / Copy Files", command=self.install_files).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Clear", command=self.clear_preview).pack(side="left", padx=(8, 0))
        ttk.Button(actions, text="Open Backups", command=self.open_backups).pack(side="left", padx=(8, 0))

        run_box = ttk.LabelFrame(main, text="Run / Dev Controls", padding=10)
        run_box.pack(fill="x", pady=(0, 8))
        cmd = ttk.Frame(run_box)
        cmd.pack(fill="x", pady=(0, 6))
        ttk.Label(cmd, text="Run command:").pack(side="left")
        ttk.Entry(cmd, textvariable=self.run_command_var).pack(side="left", fill="x", expand=True, padx=(6, 12))
        ttk.Label(cmd, text="URL:").pack(side="left")
        ttk.Entry(cmd, textvariable=self.url_var, width=32).pack(side="left", padx=(6, 0))
        ttk.Checkbutton(run_box, text="Run app in separate Command Prompt window", variable=self.run_in_cmd_var).pack(anchor="w", pady=(0, 6))
        btns = ttk.Frame(run_box)
        btns.pack(fill="x")
        ttk.Button(btns, text="Start App", command=self.start_app).pack(side="left")
        ttk.Button(btns, text="Stop App", command=self.stop_app).pack(side="left", padx=(8, 0))
        ttk.Button(btns, text="Restart App", command=self.restart_app).pack(side="left", padx=(8, 0))
        ttk.Button(btns, text="Open URL", command=self.open_url).pack(side="left", padx=(8, 0))
        ttk.Button(btns, text="Kill Node on 5173", command=self.kill_node_5173).pack(side="left", padx=(8, 0))
        ttk.Label(run_box, textvariable=self.run_status_var, foreground="#555").pack(anchor="w", pady=(6, 0))

        build_box = ttk.LabelFrame(main, text="Build / Publish Controls", padding=10)
        build_box.pack(fill="x", pady=(0, 8))
        b1 = ttk.Frame(build_box)
        b1.pack(fill="x", pady=(0, 6))
        ttk.Label(b1, text="Build command:").pack(side="left")
        ttk.Entry(b1, textvariable=self.build_command_var).pack(side="left", fill="x", expand=True, padx=(6, 8))
        ttk.Button(b1, text="Build", command=self.build_project).pack(side="left")
        b2 = ttk.Frame(build_box)
        b2.pack(fill="x", pady=(0, 6))
        ttk.Label(b2, text="Publish command:").pack(side="left")
        ttk.Entry(b2, textvariable=self.publish_command_var).pack(side="left", fill="x", expand=True, padx=(6, 8))
        ttk.Button(b2, text="Publish", command=self.publish_project).pack(side="left")
        ttk.Label(build_box, textvariable=self.build_status_var, foreground="#555").pack(anchor="w")

        git_box = ttk.LabelFrame(main, text="Git Controls", padding=10)
        git_box.pack(fill="x", pady=(0, 8))
        g1 = ttk.Frame(git_box)
        g1.pack(fill="x", pady=(0, 6))
        ttk.Label(g1, text="Commit message:").pack(side="left")
        ttk.Entry(g1, textvariable=self.git_message_var).pack(side="left", fill="x", expand=True, padx=(6, 0))
        g2 = ttk.Frame(git_box)
        g2.pack(fill="x")
        ttk.Button(g2, text="Git Status", command=self.git_status).pack(side="left")
        ttk.Button(g2, text="Git Pull", command=self.git_pull).pack(side="left", padx=(8, 0))
        ttk.Button(g2, text="Git Add All", command=self.git_add_all).pack(side="left", padx=(8, 0))
        ttk.Button(g2, text="Git Commit", command=self.git_commit).pack(side="left", padx=(8, 0))
        ttk.Button(g2, text="Git Push", command=self.git_push).pack(side="left", padx=(8, 0))
        ttk.Button(g2, text="Add + Commit + Push", command=self.git_add_commit_push).pack(side="left", padx=(8, 0))
        ttk.Label(git_box, textvariable=self.git_status_var, foreground="#555").pack(anchor="w", pady=(6, 0))

        ttk.Label(main, textvariable=self.detected_var, foreground="#555", wraplength=1080).pack(anchor="w", pady=(0, 8))

        panes = ttk.PanedWindow(main, orient="vertical")
        panes.pack(fill="both", expand=True)
        preview = ttk.LabelFrame(panes, text="Preview", padding=8)
        panes.add(preview, weight=3)
        columns = ("action", "relative", "source", "dest")
        self.tree = ttk.Treeview(preview, columns=columns, show="headings", height=12)
        for col, title, width in [("action", "Action", 90), ("relative", "Relative Path", 300), ("source", "Zip Source", 350), ("dest", "Destination", 350)]:
            self.tree.heading(col, text=title)
            self.tree.column(col, width=width, anchor="center" if col == "action" else "w")
        y = ttk.Scrollbar(preview, orient="vertical", command=self.tree.yview)
        x = ttk.Scrollbar(preview, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=y.set, xscrollcommand=x.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        y.grid(row=0, column=1, sticky="ns")
        x.grid(row=1, column=0, sticky="ew")
        preview.rowconfigure(0, weight=1)
        preview.columnconfigure(0, weight=1)

        output = ttk.LabelFrame(panes, text="Command Output", padding=8)
        panes.add(output, weight=2)
        self.output_box = scrolledtext.ScrolledText(output, height=10, wrap="word", font=("Consolas", 10))
        self.output_box.pack(fill="both", expand=True)
        ttk.Label(main, textvariable=self.status_var, relief="sunken", anchor="w").pack(fill="x", pady=(10, 0))

    def _path_row(self, parent, title, variable, button_text, command, file=False):
        box = ttk.LabelFrame(parent, text=title, padding=10)
        box.pack(fill="x", pady=(0, 8))
        ttk.Entry(box, textvariable=variable).pack(side="left", fill="x", expand=True, padx=(0, 8))
        ttk.Button(box, text=button_text, command=command).pack(side="left")

    def apply_preset(self):
        preset = PRESETS[self.preset_var.get()]
        self.run_command_var.set(preset["run"])
        self.build_command_var.set(preset["build"])
        self.publish_command_var.set(preset["publish"])
        self.url_var.set(preset["url"])
        root = self.project_root_var.get().strip()
        if root:
            self.set_destination_from_root(Path(root))
        self.clear_preview()

    def set_destination_from_root(self, root):
        dest_name = PRESETS[self.preset_var.get()]["dest"]
        self.destination_path_var.set(str(root / dest_name if dest_name else root))

    def log(self, text):
        self.output_box.insert("end", text + "\n")
        self.output_box.see("end")

    def log_threadsafe(self, text):
        self.after(0, lambda: self.log(text))

    def browse_zip(self):
        path = filedialog.askopenfilename(title="Select code zip", filetypes=[("Zip files", "*.zip"), ("All files", "*.*")])
        if path:
            self.zip_path_var.set(path)
            self.clear_preview()

    def browse_project(self):
        path = filedialog.askdirectory(title="Select project root")
        if path:
            root = Path(path)
            self.project_root_var.set(str(root))
            self.set_destination_from_root(root)
            self.clear_preview()

    def browse_destination(self):
        path = filedialog.askdirectory(title="Select destination folder")
        if path:
            self.destination_path_var.set(path)
            if not self.project_root_var.get().strip():
                self.project_root_var.set(path)
            self.clear_preview()

    def clear_preview(self):
        self.preview_rows = []
        self.source_root = None
        self.detected_var.set("")
        for item in getattr(self, "tree", []).get_children() if hasattr(self, "tree") else []:
            self.tree.delete(item)
        self.cleanup_temp()
        self.status_var.set("Preview cleared.")

    def cleanup_temp(self):
        if self.temp_dir and Path(self.temp_dir).exists():
            try:
                shutil.rmtree(self.temp_dir)
            except Exception:
                pass
        self.temp_dir = None

    def validate_paths(self):
        zip_path = Path(self.zip_path_var.get().strip())
        dest = Path(self.destination_path_var.get().strip())
        if not zip_path.exists() or not zip_path.is_file() or zip_path.suffix.lower() != ".zip":
            messagebox.showerror("Invalid zip", "Please select a valid .zip file.")
            return None, None
        if not dest.exists() or not dest.is_dir():
            messagebox.showerror("Invalid destination", "Please select a valid destination folder.")
            return None, None
        return zip_path, dest

    def project_root(self):
        text = self.project_root_var.get().strip() or self.destination_path_var.get().strip()
        root = Path(text)
        if not root.exists() or not root.is_dir():
            messagebox.showerror("Invalid project root", "Please select a valid project root folder.")
            return None
        return root

    def preview_zip(self):
        zip_path, dest = self.validate_paths()
        if not zip_path or not dest:
            return
        self.clear_preview()
        try:
            self.temp_dir = tempfile.mkdtemp(prefix="code_zip_install_")
            extract_dir = Path(self.temp_dir)
            with zipfile.ZipFile(zip_path, "r") as z:
                bad = z.testzip()
                if bad:
                    raise ValueError(f"Zip appears damaged near: {bad}")
                z.extractall(extract_dir)
            self.source_root = self.find_source_root(extract_dir)
            if not self.source_root:
                messagebox.showerror("No source found", "Could not find source files in the zip.")
                return
            self.detected_var.set(f"Detected source root inside zip: {self.source_root}")
            self.preview_rows = self.build_preview_rows(self.source_root, dest)
            self.populate_preview()
            self.status_var.set(f"Preview ready. {len(self.preview_rows)} file(s) will be copied.")
        except Exception as exc:
            self.cleanup_temp()
            messagebox.showerror("Preview failed", str(exc))
            self.status_var.set("Preview failed.")

    def find_source_root(self, extract_dir):
        extract_dir = Path(extract_dir)
        preset = self.preset_var.get()
        if preset == "Vite / Firebase Web App":
            srcs = [Path(root) for root, dirs, files in os.walk(extract_dir) if Path(root).name == "src"]
            if srcs:
                srcs.sort(key=lambda p: len(p.parts))
                return srcs[0]
            if (extract_dir / "games").exists():
                return extract_dir
        if preset == "Python Project":
            indicators = ["main.py", "app.py", "pyproject.toml", "requirements.txt", "setup.py", "Pipfile"]
            if any((extract_dir / name).exists() for name in indicators) or any(extract_dir.glob("*.py")):
                return extract_dir
        children = [p for p in extract_dir.iterdir() if p.is_dir()]
        files = [p for p in extract_dir.iterdir() if p.is_file()]
        if len(children) == 1 and not files:
            return children[0]
        source_exts = {".py", ".js", ".jsx", ".ts", ".tsx", ".css", ".html", ".json", ".md", ".txt", ".toml", ".yaml", ".yml"}
        if any(p.is_file() and p.suffix.lower() in source_exts for p in extract_dir.rglob("*")):
            return extract_dir
        return None

    def build_preview_rows(self, source_root, dest):
        rows = []
        for src in Path(source_root).rglob("*"):
            if not src.is_file():
                continue
            if any(part in IGNORED_NAMES for part in src.parts):
                continue
            rel = src.relative_to(source_root)
            dst = Path(dest) / rel
            rows.append({
                "action": "Overwrite" if dst.exists() else "Create",
                "relative": str(rel).replace("\\", "/"),
                "source": src,
                "dest": dst,
            })
        rows.sort(key=lambda r: r["relative"].lower())
        return rows

    def populate_preview(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        for row in self.preview_rows:
            self.tree.insert("", "end", values=(row["action"], row["relative"], str(row["source"]), str(row["dest"])))

    def install_files(self):
        if not self.preview_rows:
            self.preview_zip()
        if not self.preview_rows:
            return
        creates = sum(1 for r in self.preview_rows if r["action"] == "Create")
        overwrites = sum(1 for r in self.preview_rows if r["action"] == "Overwrite")
        if not messagebox.askyesno("Confirm install", f"Copy {len(self.preview_rows)} file(s)?\n\nCreate: {creates}\nOverwrite: {overwrites}\n\nOverwritten files will be backed up first."):
            return
        backup_root = self.backup_root()
        copied = backed = 0
        try:
            for row in self.preview_rows:
                src = row["source"]
                dst = row["dest"]
                dst.parent.mkdir(parents=True, exist_ok=True)
                if dst.exists():
                    self.backup_file(dst, backup_root)
                    backed += 1
                shutil.copy2(src, dst)
                copied += 1
            messagebox.showinfo("Install complete", f"Copied {copied} file(s).\nBacked up {backed} file(s).\n\nBackup folder:\n{backup_root}")
            self.status_var.set(f"Install complete. Copied {copied}; backed up {backed}.")
        except Exception as exc:
            messagebox.showerror("Install failed", str(exc))
            self.status_var.set("Install failed.")

    def backup_root(self):
        root = self.project_root() or Path(self.destination_path_var.get().strip())
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        path = root / "_code_zip_backups" / f"backup_{stamp}"
        path.mkdir(parents=True, exist_ok=True)
        return path

    def backup_file(self, dst, backup_root):
        dest_root = Path(self.destination_path_var.get().strip())
        rel = dst.relative_to(dest_root)
        backup = backup_root / rel
        backup.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(dst, backup)

    def open_backups(self):
        root = self.project_root()
        if not root:
            return
        path = root / "_code_zip_backups"
        path.mkdir(parents=True, exist_ok=True)
        if os.name == "nt":
            os.startfile(path)
        else:
            subprocess.Popen(["xdg-open", str(path)])

    def run_capture(self, command, cwd, status_var=None):
        self.log("")
        self.log(f"> {command}")
        self.log(f"cwd: {cwd}")
        try:
            completed = subprocess.run(command, cwd=str(cwd), shell=True, capture_output=True, text=True)
            out = (completed.stdout or "").strip()
            err = (completed.stderr or "").strip()
            if out:
                self.log(out)
            if err:
                self.log(err)
            self.log(f"exit code: {completed.returncode}")
            if status_var:
                status_var.set("Command completed." if completed.returncode == 0 else "Command failed.")
            return completed.returncode, out, err
        except Exception as exc:
            self.log(str(exc))
            if status_var:
                status_var.set(f"Command error: {exc}")
            return 1, "", str(exc)

    def run_stream(self, command, cwd, status_var=None, done="Command completed."):
        def worker():
            self.log_threadsafe("")
            self.log_threadsafe(f"> {command}")
            self.log_threadsafe(f"cwd: {cwd}")
            if status_var:
                self.after(0, lambda: status_var.set(f"Running: {command}"))
            try:
                proc = subprocess.Popen(command, cwd=str(cwd), shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1)
                for line in proc.stdout:
                    clean = line.rstrip()
                    if clean:
                        self.log_threadsafe(clean)
                code = proc.wait()
                self.log_threadsafe(f"exit code: {code}")
                if status_var:
                    self.after(0, lambda: status_var.set(done if code == 0 else f"Command failed: {command}"))
            except Exception as exc:
                self.log_threadsafe(str(exc))
                if status_var:
                    self.after(0, lambda: status_var.set(f"Command error: {exc}"))
        threading.Thread(target=worker, daemon=True).start()

    def git_root(self):
        root = self.project_root()
        if not root:
            return None
        if not (root / ".git").exists():
            if not messagebox.askyesno("No .git folder", f"No .git folder was found in:\n\n{root}\n\nContinue anyway?"):
                return None
        return root

    def git_status(self):
        root = self.git_root()
        if root:
            self.run_capture("git status --short", root, self.git_status_var)

    def git_pull(self):
        root = self.git_root()
        if root and messagebox.askyesno("Confirm git pull", "Run git pull?"):
            self.run_capture("git pull", root, self.git_status_var)

    def git_add_all(self):
        root = self.git_root()
        if root:
            self.run_capture("git add -A", root, self.git_status_var)
            self.run_capture("git status --short", root, self.git_status_var)

    def git_commit(self):
        root = self.git_root()
        if not root:
            return
        msg = self.git_message_var.get().strip()
        if not msg:
            messagebox.showerror("Missing commit message", "Enter a commit message.")
            return
        safe = msg.replace('"', '\\"')
        self.run_capture(f'git commit -m "{safe}"', root, self.git_status_var)

    def git_push(self):
        root = self.git_root()
        if root and messagebox.askyesno("Confirm git push", "Run git push?"):
            self.run_capture("git push", root, self.git_status_var)

    def git_add_commit_push(self):
        root = self.git_root()
        if not root:
            return
        msg = self.git_message_var.get().strip()
        if not msg:
            messagebox.showerror("Missing commit message", "Enter a commit message.")
            return
        if not messagebox.askyesno("Confirm Git Update", f"Run git add, commit, and push?\n\nCommit message:\n{msg}"):
            return
        self.run_capture("git add -A", root, self.git_status_var)
        safe = msg.replace('"', '\\"')
        code, out, err = self.run_capture(f'git commit -m "{safe}"', root, self.git_status_var)
        combined = (out + "\n" + err).lower()
        if code != 0 and "nothing to commit" not in combined:
            messagebox.showerror("Commit failed", "Commit failed. Check command output.")
            return
        if "nothing to commit" in combined:
            messagebox.showinfo("Nothing to commit", "Git says there is nothing to commit. Push skipped.")
            return
        self.run_capture("git push", root, self.git_status_var)

    def build_project(self):
        root = self.project_root()
        cmd = self.build_command_var.get().strip()
        if root and cmd:
            self.run_stream(cmd, root, self.build_status_var, "Build completed.")
        elif not cmd:
            messagebox.showerror("Missing build command", "Enter a build command.")

    def publish_project(self):
        root = self.project_root()
        cmd = self.publish_command_var.get().strip()
        if not root:
            return
        if not cmd:
            messagebox.showerror("Missing publish command", "Enter a publish command.")
            return
        if messagebox.askyesno("Confirm Publish", f"Run this publish command?\n\n{cmd}"):
            self.run_stream(cmd, root, self.build_status_var, "Publish completed.")

    def start_app(self):
        if self.run_process:
            try:
                if self.run_process.poll() is None:
                    messagebox.showinfo("Already running", "The app is already running.")
                    return
            except Exception:
                self.run_process = None
        root = self.project_root()
        cmd = self.run_command_var.get().strip()
        if not root:
            return
        if not cmd:
            messagebox.showerror("Missing run command", "Enter a run command.")
            return
        try:
            if self.run_in_cmd_var.get() and os.name == "nt":
                full = f'cmd /k "{cmd}"'
                self.run_process = subprocess.Popen(full, cwd=str(root), shell=True, creationflags=subprocess.CREATE_NEW_CONSOLE)
                self.run_status_var.set(f"App launched in separate Command Prompt. PID {self.run_process.pid}.")
                self.log("")
                self.log(f"> {full}")
                self.log(f"cwd: {root}")
                self.after(1500, self.open_url_if_set)
                return
            self.run_process = subprocess.Popen(cmd, cwd=str(root), shell=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, bufsize=1, creationflags=self.creation_flags())
            self.run_status_var.set(f"App starting with PID {self.run_process.pid}...")
            self.run_thread = threading.Thread(target=self.read_run_output, daemon=True)
            self.run_thread.start()
            self.after(1500, self.open_url_if_set)
        except Exception as exc:
            self.run_process = None
            messagebox.showerror("Could not start app", str(exc))

    def creation_flags(self):
        return subprocess.CREATE_NEW_PROCESS_GROUP if os.name == "nt" else 0

    def read_run_output(self):
        if not self.run_process or not self.run_process.stdout:
            return
        for line in self.run_process.stdout:
            clean = line.strip()
            if clean:
                self.after(0, lambda t=clean: self.update_run_status(t))
        self.after(0, self.handle_run_end)

    def update_run_status(self, text):
        self.run_status_var.set(text)
        self.log(text)

    def handle_run_end(self):
        try:
            if self.run_process and self.run_process.poll() is not None:
                self.run_status_var.set(f"App stopped. Exit code: {self.run_process.poll()}")
        except Exception:
            self.run_process = None

    def stop_app(self):
        if not self.run_process:
            self.run_status_var.set("App is not running.")
            return
        try:
            if self.run_process.poll() is not None:
                self.run_process = None
                self.run_status_var.set("App is not running.")
                return
        except Exception:
            self.run_process = None
            self.run_status_var.set("Invalid app handle cleared.")
            return
        try:
            if os.name == "nt":
                try:
                    self.run_process.send_signal(signal.CTRL_BREAK_EVENT)
                    time.sleep(0.8)
                except Exception:
                    pass
            self.run_process.terminate()
            time.sleep(0.8)
            if self.run_process.poll() is None:
                self.run_process.kill()
            self.run_process = None
            self.run_status_var.set("App stopped.")
        except Exception as exc:
            self.run_process = None
            messagebox.showwarning("App handle cleared", f"Could not stop cleanly.\n\n{exc}")

    def restart_app(self):
        self.stop_app()
        self.after(1000, self.start_app)

    def open_url_if_set(self):
        if self.url_var.get().strip():
            self.open_url()

    def open_url(self):
        url = self.url_var.get().strip()
        if not url:
            messagebox.showinfo("No URL", "No URL is set for this project.")
            return
        webbrowser.open(url)

    def kill_node_5173(self):
        if not messagebox.askyesno("Kill Node on 5173", "Try to kill the process listening on port 5173?"):
            return
        if os.name == "nt":
            cmd = 'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :5173 ^| findstr LISTENING\') do taskkill /PID %a /F'
        else:
            cmd = "lsof -ti:5173 | xargs kill -9"
        self.run_capture(cmd, self.project_root() or Path.cwd(), self.run_status_var)
        self.run_process = None

    def on_close(self):
        if self.run_process:
            try:
                running = self.run_process.poll() is None
            except Exception:
                running = False
            if running and messagebox.askyesno("App is still running", "Stop it before closing?"):
                self.stop_app()
        self.cleanup_temp()
        self.destroy()


def main():
    app = GenericCodeZipInstaller()
    app.mainloop()

if __name__ == "__main__":
    main()
