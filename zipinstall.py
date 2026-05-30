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


APP_TITLE = "Code Zip to src Installer"


class ZipToSrcInstaller(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title(APP_TITLE)
        self.geometry("1120x900")
        self.minsize(900, 700)

        self.zip_path_var = tk.StringVar()
        self.project_root_var = tk.StringVar()
        self.src_path_var = tk.StringVar()

        self.dev_command_var = tk.StringVar(value="npm run dev")
        self.dev_url_var = tk.StringVar(value="http://localhost:5173")
        self.dev_separate_window_var = tk.BooleanVar(value=True)

        self.publish_command_var = tk.StringVar(value="npm run build && firebase deploy")
        self.git_message_var = tk.StringVar(value="Update Five Parsecs files")

        self.status_var = tk.StringVar(value="Select a zip file and your project folders.")
        self.detected_root_var = tk.StringVar(value="")
        self.dev_status_var = tk.StringVar(value="Dev app is not running.")
        self.git_status_var = tk.StringVar(value="Git commands have not run yet.")
        self.publish_status_var = tk.StringVar(value="Publish has not run yet.")

        self.preview_rows = []
        self.extracted_temp_dir = None
        self.detected_source_root = None
        self.dev_process = None
        self.dev_output_thread = None
        self.command_threads = []

        self._build_ui()
        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def _build_ui(self):
        main = ttk.Frame(self, padding=12)
        main.pack(fill="both", expand=True)

        title = ttk.Label(main, text=APP_TITLE, font=("Segoe UI", 16, "bold"))
        title.pack(anchor="w", pady=(0, 10))

        zip_frame = ttk.LabelFrame(main, text="1. Select downloaded zip file", padding=10)
        zip_frame.pack(fill="x", pady=(0, 8))

        ttk.Entry(zip_frame, textvariable=self.zip_path_var).pack(
            side="left", fill="x", expand=True, padx=(0, 8)
        )
        ttk.Button(zip_frame, text="Browse Zip...", command=self.browse_zip).pack(side="left")

        project_frame = ttk.LabelFrame(main, text="2. Select project root", padding=10)
        project_frame.pack(fill="x", pady=(0, 8))

        ttk.Entry(project_frame, textvariable=self.project_root_var).pack(
            side="left", fill="x", expand=True, padx=(0, 8)
        )
        ttk.Button(project_frame, text="Browse Project...", command=self.browse_project_root).pack(
            side="left"
        )

        src_frame = ttk.LabelFrame(main, text="3. Project src folder", padding=10)
        src_frame.pack(fill="x", pady=(0, 8))

        ttk.Entry(src_frame, textvariable=self.src_path_var).pack(
            side="left", fill="x", expand=True, padx=(0, 8)
        )
        ttk.Button(src_frame, text="Browse src...", command=self.browse_src).pack(side="left")

        actions = ttk.Frame(main)
        actions.pack(fill="x", pady=(0, 8))

        ttk.Button(actions, text="Preview Files", command=self.preview_zip).pack(side="left")
        ttk.Button(actions, text="Install / Copy Files", command=self.install_files).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(actions, text="Clear", command=self.clear_preview).pack(side="left", padx=(8, 0))

        dev_frame = ttk.LabelFrame(main, text="Dev App Controls", padding=10)
        dev_frame.pack(fill="x", pady=(0, 8))

        command_row = ttk.Frame(dev_frame)
        command_row.pack(fill="x", pady=(0, 6))

        ttk.Label(command_row, text="Command:").pack(side="left")
        ttk.Entry(command_row, textvariable=self.dev_command_var, width=30).pack(
            side="left", padx=(6, 12)
        )

        ttk.Label(command_row, text="URL:").pack(side="left")
        ttk.Entry(command_row, textvariable=self.dev_url_var, width=30).pack(
            side="left", padx=(6, 12)
        )

        separate_row = ttk.Frame(dev_frame)
        separate_row.pack(fill="x", pady=(0, 6))

        ttk.Checkbutton(
            separate_row,
            text="Run dev app in separate Command Prompt window",
            variable=self.dev_separate_window_var,
        ).pack(side="left")

        button_row = ttk.Frame(dev_frame)
        button_row.pack(fill="x")

        ttk.Button(button_row, text="Start Dev App", command=self.start_dev_app).pack(side="left")
        ttk.Button(button_row, text="Stop Dev App", command=self.stop_dev_app).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(button_row, text="Restart Dev App", command=self.restart_dev_app).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(button_row, text="Open Browser", command=self.open_browser).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(button_row, text="Kill Node on 5173", command=self.kill_port_5173).pack(
            side="left", padx=(8, 0)
        )

        ttk.Label(dev_frame, textvariable=self.dev_status_var, foreground="#555555").pack(
            anchor="w", pady=(6, 0)
        )

        publish_frame = ttk.LabelFrame(main, text="Publish Controls", padding=10)
        publish_frame.pack(fill="x", pady=(0, 8))

        publish_row = ttk.Frame(publish_frame)
        publish_row.pack(fill="x", pady=(0, 6))

        ttk.Label(publish_row, text="Publish command:").pack(side="left")
        ttk.Entry(publish_row, textvariable=self.publish_command_var).pack(
            side="left", fill="x", expand=True, padx=(6, 8)
        )
        ttk.Button(publish_row, text="Publish", command=self.publish_app).pack(side="left")
        ttk.Button(publish_row, text="Build Only", command=self.build_only).pack(
            side="left", padx=(8, 0)
        )

        ttk.Label(publish_frame, textvariable=self.publish_status_var, foreground="#555555").pack(
            anchor="w"
        )

        git_frame = ttk.LabelFrame(main, text="Git Controls", padding=10)
        git_frame.pack(fill="x", pady=(0, 8))

        git_message_row = ttk.Frame(git_frame)
        git_message_row.pack(fill="x", pady=(0, 6))

        ttk.Label(git_message_row, text="Commit message:").pack(side="left")
        ttk.Entry(git_message_row, textvariable=self.git_message_var).pack(
            side="left", fill="x", expand=True, padx=(6, 0)
        )

        git_button_row = ttk.Frame(git_frame)
        git_button_row.pack(fill="x")

        ttk.Button(git_button_row, text="Git Status", command=self.git_status).pack(side="left")
        ttk.Button(git_button_row, text="Git Pull", command=self.git_pull).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(git_button_row, text="Git Add All", command=self.git_add_all).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(git_button_row, text="Git Commit", command=self.git_commit).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(git_button_row, text="Git Push", command=self.git_push).pack(
            side="left", padx=(8, 0)
        )
        ttk.Button(
            git_button_row,
            text="Add + Commit + Push",
            command=self.git_add_commit_push,
        ).pack(side="left", padx=(8, 0))

        ttk.Label(git_frame, textvariable=self.git_status_var, foreground="#555555").pack(
            anchor="w", pady=(6, 0)
        )

        detected = ttk.Label(
            main,
            textvariable=self.detected_root_var,
            foreground="#555555",
            wraplength=1040,
        )
        detected.pack(anchor="w", pady=(0, 8))

        lower_pane = ttk.PanedWindow(main, orient="vertical")
        lower_pane.pack(fill="both", expand=True)

        preview_frame = ttk.LabelFrame(lower_pane, text="Preview", padding=8)
        lower_pane.add(preview_frame, weight=3)

        columns = ("action", "relative_path", "source_path", "destination_path")
        self.tree = ttk.Treeview(preview_frame, columns=columns, show="headings", height=12)

        self.tree.heading("action", text="Action")
        self.tree.heading("relative_path", text="Relative Path")
        self.tree.heading("source_path", text="Zip Source")
        self.tree.heading("destination_path", text="Destination")

        self.tree.column("action", width=90, anchor="center")
        self.tree.column("relative_path", width=280)
        self.tree.column("source_path", width=330)
        self.tree.column("destination_path", width=330)

        y_scroll = ttk.Scrollbar(preview_frame, orient="vertical", command=self.tree.yview)
        x_scroll = ttk.Scrollbar(preview_frame, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=y_scroll.set, xscrollcommand=x_scroll.set)

        self.tree.grid(row=0, column=0, sticky="nsew")
        y_scroll.grid(row=0, column=1, sticky="ns")
        x_scroll.grid(row=1, column=0, sticky="ew")

        preview_frame.rowconfigure(0, weight=1)
        preview_frame.columnconfigure(0, weight=1)

        output_frame = ttk.LabelFrame(lower_pane, text="Command Output", padding=8)
        lower_pane.add(output_frame, weight=2)

        self.output_box = scrolledtext.ScrolledText(
            output_frame,
            height=10,
            wrap="word",
            font=("Consolas", 10),
        )
        self.output_box.pack(fill="both", expand=True)

        status = ttk.Label(main, textvariable=self.status_var, relief="sunken", anchor="w")
        status.pack(fill="x", pady=(10, 0))

    def log_output(self, text):
        self.output_box.insert("end", text + "\n")
        self.output_box.see("end")

    def log_output_threadsafe(self, text):
        self.after(0, lambda: self.log_output(text))

    def browse_zip(self):
        path = filedialog.askopenfilename(
            title="Select downloaded code zip",
            filetypes=[("Zip files", "*.zip"), ("All files", "*.*")]
        )

        if path:
            self.zip_path_var.set(path)
            self.clear_preview()

    def browse_project_root(self):
        path = filedialog.askdirectory(title="Select your project root folder")

        if not path:
            return

        project_root = Path(path)
        self.project_root_var.set(str(project_root))

        src_path = project_root / "src"
        if src_path.exists() and src_path.is_dir():
            self.src_path_var.set(str(src_path))

        self.clear_preview()

    def browse_src(self):
        path = filedialog.askdirectory(title="Select your project src folder")

        if not path:
            return

        selected = Path(path)

        if selected.name != "src":
            proceed = messagebox.askyesno(
                "Folder is not named src",
                f"You selected:\n\n{selected}\n\n"
                "This folder is not named 'src'. Continue anyway?"
            )
            if not proceed:
                return

        self.src_path_var.set(str(selected))

        if not self.project_root_var.get().strip():
            self.project_root_var.set(str(selected.parent))

        self.clear_preview()

    def clear_preview(self):
        self.preview_rows = []
        self.detected_source_root = None
        self.detected_root_var.set("")
        self.status_var.set("Preview cleared.")

        for item in self.tree.get_children():
            self.tree.delete(item)

        self.cleanup_temp_dir()

    def cleanup_temp_dir(self):
        if self.extracted_temp_dir and Path(self.extracted_temp_dir).exists():
            try:
                shutil.rmtree(self.extracted_temp_dir)
            except Exception:
                pass

        self.extracted_temp_dir = None

    def validate_inputs(self):
        zip_path = Path(self.zip_path_var.get().strip())
        src_path = Path(self.src_path_var.get().strip())

        if not zip_path.exists() or not zip_path.is_file():
            messagebox.showerror("Missing zip file", "Please select a valid zip file.")
            return None, None

        if zip_path.suffix.lower() != ".zip":
            messagebox.showerror("Not a zip file", "The selected file is not a .zip file.")
            return None, None

        if not src_path.exists() or not src_path.is_dir():
            messagebox.showerror("Missing src folder", "Please select a valid project src folder.")
            return None, None

        return zip_path, src_path

    def validate_project_root(self):
        project_root_text = self.project_root_var.get().strip()

        if not project_root_text:
            src_path_text = self.src_path_var.get().strip()
            if src_path_text:
                project_root_text = str(Path(src_path_text).parent)
                self.project_root_var.set(project_root_text)

        project_root = Path(project_root_text)

        if not project_root.exists() or not project_root.is_dir():
            messagebox.showerror(
                "Missing project root",
                "Please select your project root folder, the folder that contains package.json."
            )
            return None

        return project_root

    def validate_package_root(self):
        project_root = self.validate_project_root()
        if not project_root:
            return None

        package_json = project_root / "package.json"
        if not package_json.exists():
            proceed = messagebox.askyesno(
                "package.json not found",
                f"I do not see package.json in:\n\n{project_root}\n\n"
                "Build/publish usually needs to be started from the project root.\n\n"
                "Continue anyway?"
            )
            if not proceed:
                return None

        return project_root

    def validate_git_root(self):
        project_root = self.validate_project_root()
        if not project_root:
            return None

        git_folder = project_root / ".git"
        if not git_folder.exists():
            proceed = messagebox.askyesno(
                "Git repository not found",
                f"I do not see a .git folder in:\n\n{project_root}\n\n"
                "Continue anyway? Git may still work if this is a worktree or nested repo."
            )
            if not proceed:
                return None

        return project_root

    def preview_zip(self):
        zip_path, src_path = self.validate_inputs()

        if not zip_path or not src_path:
            return

        self.clear_preview()

        try:
            self.extracted_temp_dir = tempfile.mkdtemp(prefix="code_zip_install_")
            extract_dir = Path(self.extracted_temp_dir)

            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                bad_file = zip_ref.testzip()
                if bad_file:
                    raise ValueError(f"Zip file appears damaged near: {bad_file}")

                zip_ref.extractall(extract_dir)

            self.detected_source_root = self.find_source_root(extract_dir)

            if not self.detected_source_root:
                messagebox.showerror(
                    "No source files found",
                    "I could not find a usable src folder or source file structure in the zip."
                )
                return

            self.detected_root_var.set(
                f"Detected source root inside zip: {self.detected_source_root}"
            )

            self.preview_rows = self.build_preview_rows(
                source_root=self.detected_source_root,
                destination_src=src_path,
            )

            self.populate_preview_tree()

            self.status_var.set(
                f"Preview ready. {len(self.preview_rows)} file(s) will be copied."
            )

        except Exception as exc:
            self.cleanup_temp_dir()
            messagebox.showerror("Preview failed", str(exc))
            self.status_var.set("Preview failed.")

    def find_source_root(self, extract_dir):
        extract_dir = Path(extract_dir)

        src_candidates = []

        for root, dirs, files in os.walk(extract_dir):
            root_path = Path(root)

            if root_path.name == "src":
                src_candidates.append(root_path)

        if src_candidates:
            src_candidates.sort(key=lambda path: len(path.parts))
            return src_candidates[0]

        if (extract_dir / "games").exists():
            return extract_dir

        children = [child for child in extract_dir.iterdir() if child.is_dir()]

        if len(children) == 1:
            single = children[0]

            if (single / "games").exists():
                return single

            if (single / "src").exists():
                return single / "src"

        source_extensions = {".js", ".jsx", ".ts", ".tsx", ".css", ".json"}
        for file_path in extract_dir.rglob("*"):
            if file_path.is_file() and file_path.suffix.lower() in source_extensions:
                return extract_dir

        return None

    def build_preview_rows(self, source_root, destination_src):
        source_root = Path(source_root)
        destination_src = Path(destination_src)

        rows = []

        ignored_names = {
            "__MACOSX",
            ".DS_Store",
            "Thumbs.db",
        }

        for source_file in source_root.rglob("*"):
            if not source_file.is_file():
                continue

            if any(part in ignored_names for part in source_file.parts):
                continue

            relative_path = source_file.relative_to(source_root)
            destination_file = destination_src / relative_path

            if destination_file.exists():
                action = "Overwrite"
            else:
                action = "Create"

            rows.append(
                {
                    "action": action,
                    "relative_path": str(relative_path).replace("\\", "/"),
                    "source_path": str(source_file),
                    "destination_path": str(destination_file),
                    "source_file": source_file,
                    "destination_file": destination_file,
                }
            )

        rows.sort(key=lambda row: row["relative_path"].lower())
        return rows

    def populate_preview_tree(self):
        for item in self.tree.get_children():
            self.tree.delete(item)

        for row in self.preview_rows:
            self.tree.insert(
                "",
                "end",
                values=(
                    row["action"],
                    row["relative_path"],
                    row["source_path"],
                    row["destination_path"],
                ),
            )

    def install_files(self):
        if not self.preview_rows:
            self.preview_zip()

        if not self.preview_rows:
            return

        overwrite_count = sum(1 for row in self.preview_rows if row["action"] == "Overwrite")
        create_count = sum(1 for row in self.preview_rows if row["action"] == "Create")

        proceed = messagebox.askyesno(
            "Confirm install",
            f"This will copy {len(self.preview_rows)} file(s) into your src folder.\n\n"
            f"Create: {create_count}\n"
            f"Overwrite: {overwrite_count}\n\n"
            "Existing files will be backed up before they are overwritten.\n\n"
            "Continue?"
        )

        if not proceed:
            return

        try:
            backup_root = self.create_backup_root()

            copied = 0
            backed_up = 0

            for row in self.preview_rows:
                source_file = Path(row["source_file"])
                destination_file = Path(row["destination_file"])

                destination_file.parent.mkdir(parents=True, exist_ok=True)

                if destination_file.exists():
                    self.backup_file(destination_file, backup_root)
                    backed_up += 1

                shutil.copy2(source_file, destination_file)
                copied += 1

            messagebox.showinfo(
                "Install complete",
                f"Copied {copied} file(s).\n"
                f"Backed up {backed_up} overwritten file(s).\n\n"
                f"Backup folder:\n{backup_root}"
            )

            self.status_var.set(
                f"Install complete. Copied {copied} file(s). Backed up {backed_up} file(s)."
            )

        except Exception as exc:
            messagebox.showerror("Install failed", str(exc))
            self.status_var.set("Install failed.")

    def create_backup_root(self):
        src_path = Path(self.src_path_var.get().strip())
        project_root = src_path.parent

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_root = project_root / "_src_backups" / f"backup_{timestamp}"

        backup_root.mkdir(parents=True, exist_ok=True)
        return backup_root

    def backup_file(self, destination_file, backup_root):
        src_path = Path(self.src_path_var.get().strip())
        relative_path = destination_file.relative_to(src_path)

        backup_file = backup_root / relative_path
        backup_file.parent.mkdir(parents=True, exist_ok=True)

        shutil.copy2(destination_file, backup_file)

    def run_command_capture(self, command, cwd, status_var=None):
        self.log_output("")
        self.log_output(f"> {command}")
        self.log_output(f"cwd: {cwd}")

        try:
            completed = subprocess.run(
                command,
                cwd=str(cwd),
                shell=True,
                capture_output=True,
                text=True,
            )

            output = (completed.stdout or "").strip()
            error = (completed.stderr or "").strip()

            if output:
                self.log_output(output)
            if error:
                self.log_output(error)

            self.log_output(f"exit code: {completed.returncode}")

            if status_var:
                if completed.returncode == 0:
                    status_var.set(f"Command completed: {command}")
                else:
                    status_var.set(f"Command failed: {command}")

            return completed.returncode, output, error

        except Exception as exc:
            self.log_output(str(exc))
            if status_var:
                status_var.set(f"Command error: {exc}")
            return 1, "", str(exc)

    def run_command_streaming(self, command, cwd, status_var=None, done_message="Command finished."):
        def worker():
            self.log_output_threadsafe("")
            self.log_output_threadsafe(f"> {command}")
            self.log_output_threadsafe(f"cwd: {cwd}")

            if status_var:
                self.after(0, lambda: status_var.set(f"Running: {command}"))

            try:
                process = subprocess.Popen(
                    command,
                    cwd=str(cwd),
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.STDOUT,
                    text=True,
                    bufsize=1,
                )

                for line in process.stdout:
                    clean = line.rstrip()
                    if clean:
                        self.log_output_threadsafe(clean)

                return_code = process.wait()
                self.log_output_threadsafe(f"exit code: {return_code}")

                if status_var:
                    if return_code == 0:
                        self.after(0, lambda: status_var.set(done_message))
                    else:
                        self.after(0, lambda: status_var.set(f"Command failed: {command}"))

            except Exception as exc:
                self.log_output_threadsafe(str(exc))
                if status_var:
                    self.after(0, lambda: status_var.set(f"Command error: {exc}"))

        thread = threading.Thread(target=worker, daemon=True)
        self.command_threads.append(thread)
        thread.start()

    def git_status(self):
        project_root = self.validate_git_root()
        if not project_root:
            return

        self.run_command_capture("git status --short", project_root, self.git_status_var)

    def git_pull(self):
        project_root = self.validate_git_root()
        if not project_root:
            return

        proceed = messagebox.askyesno(
            "Confirm git pull",
            "Run git pull?\n\nThis may modify files in your project folder."
        )
        if not proceed:
            return

        self.run_command_capture("git pull", project_root, self.git_status_var)

    def git_add_all(self):
        project_root = self.validate_git_root()
        if not project_root:
            return

        self.run_command_capture("git add -A", project_root, self.git_status_var)
        self.run_command_capture("git status --short", project_root, self.git_status_var)

    def git_commit(self):
        project_root = self.validate_git_root()
        if not project_root:
            return

        message = self.git_message_var.get().strip()
        if not message:
            messagebox.showerror("Missing commit message", "Please enter a commit message.")
            return

        safe_message = message.replace('"', '\\"')
        code, output, error = self.run_command_capture(
            f'git commit -m "{safe_message}"',
            project_root,
            self.git_status_var,
        )

        if code != 0 and "nothing to commit" in (output + error).lower():
            messagebox.showinfo("Nothing to commit", "Git says there is nothing to commit.")

    def git_push(self):
        project_root = self.validate_git_root()
        if not project_root:
            return

        proceed = messagebox.askyesno(
            "Confirm git push",
            "Run git push?\n\nThis will publish your committed changes to the remote repository."
        )
        if not proceed:
            return

        self.run_command_capture("git push", project_root, self.git_status_var)

    def git_add_commit_push(self):
        project_root = self.validate_git_root()
        if not project_root:
            return

        message = self.git_message_var.get().strip()
        if not message:
            messagebox.showerror("Missing commit message", "Please enter a commit message.")
            return

        proceed = messagebox.askyesno(
            "Confirm Git Update",
            "This will run:\n\n"
            "git add -A\n"
            f'git commit -m "{message}"\n'
            "git push\n\n"
            "Continue?"
        )
        if not proceed:
            return

        self.run_command_capture("git add -A", project_root, self.git_status_var)

        safe_message = message.replace('"', '\\"')
        code, output, error = self.run_command_capture(
            f'git commit -m "{safe_message}"',
            project_root,
            self.git_status_var,
        )

        combined = (output + "\n" + error).lower()

        if code != 0 and "nothing to commit" not in combined:
            messagebox.showerror(
                "Commit failed",
                "Git commit failed. Check the command output before pushing."
            )
            return

        if "nothing to commit" in combined:
            messagebox.showinfo(
                "Nothing to commit",
                "Git says there was nothing to commit. Push will be skipped."
            )
            return

        self.run_command_capture("git push", project_root, self.git_status_var)

    def publish_app(self):
        project_root = self.validate_package_root()
        if not project_root:
            return

        command = self.publish_command_var.get().strip()
        if not command:
            messagebox.showerror(
                "Missing publish command",
                "Enter a publish command, such as npm run build && firebase deploy."
            )
            return

        proceed = messagebox.askyesno(
            "Confirm Publish",
            "This will publish/deploy your app using:\n\n"
            f"{command}\n\n"
            "Run this only after testing the dev app.\n\n"
            "Continue?"
        )

        if not proceed:
            return

        self.run_command_streaming(
            command,
            project_root,
            self.publish_status_var,
            done_message="Publish completed.",
        )

    def build_only(self):
        project_root = self.validate_package_root()
        if not project_root:
            return

        self.run_command_streaming(
            "npm run build",
            project_root,
            self.publish_status_var,
            done_message="Build completed.",
        )

    def start_dev_app(self):
        if self.dev_process:
            try:
                if self.dev_process.poll() is None:
                    messagebox.showinfo("Dev app already running", "The dev app is already running.")
                    return
            except Exception:
                self.dev_process = None
                self.dev_status_var.set("Old dev app handle was invalid and has been cleared.")

        project_root = self.validate_package_root()
        if not project_root:
            return

        command = self.dev_command_var.get().strip()
        if not command:
            messagebox.showerror("Missing command", "Enter a dev command, such as npm run dev.")
            return

        try:
            if self.dev_separate_window_var.get() and os.name == "nt":
                cmd_command = f'cmd /k "{command}"'

                self.dev_process = subprocess.Popen(
                    cmd_command,
                    cwd=str(project_root),
                    shell=True,
                    creationflags=subprocess.CREATE_NEW_CONSOLE,
                )

                self.dev_status_var.set(
                    f"Dev app launched in a separate Command Prompt window. PID {self.dev_process.pid}."
                )
                self.status_var.set("Dev app launched in separate Command Prompt.")
                self.log_output("")
                self.log_output(f"> {cmd_command}")
                self.log_output(f"cwd: {project_root}")
                self.log_output("Dev app is running in a separate Command Prompt window.")
                self.log_output("To stop it: click in that window and press Ctrl+C.")
                self.after(1500, self.open_browser_if_running)
                return

            self.dev_process = subprocess.Popen(
                command,
                cwd=str(project_root),
                shell=True,
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                creationflags=self.get_creation_flags(),
            )

            self.dev_status_var.set(f"Dev app starting with PID {self.dev_process.pid}...")
            self.status_var.set("Dev app starting.")

            self.dev_output_thread = threading.Thread(
                target=self.read_dev_output,
                daemon=True,
            )
            self.dev_output_thread.start()

            self.after(1500, self.open_browser_if_running)

        except Exception as exc:
            self.dev_process = None
            messagebox.showerror("Could not start dev app", str(exc))
            self.dev_status_var.set("Dev app failed to start.")

    def get_creation_flags(self):
        if os.name == "nt":
            return subprocess.CREATE_NEW_PROCESS_GROUP
        return 0

    def read_dev_output(self):
        if not self.dev_process or not self.dev_process.stdout:
            return

        for line in self.dev_process.stdout:
            clean_line = line.strip()

            if not clean_line:
                continue

            self.after(0, lambda text=clean_line: self.update_dev_status_from_output(text))

        self.after(0, self.handle_dev_process_ended)

    def update_dev_status_from_output(self, text):
        self.dev_status_var.set(text)
        self.log_output(text)

        lower = text.lower()
        if "local:" in lower or "localhost:" in lower or "ready in" in lower:
            self.status_var.set("Dev app is running.")

    def handle_dev_process_ended(self):
        try:
            if self.dev_process and self.dev_process.poll() is not None:
                code = self.dev_process.poll()
                self.dev_status_var.set(f"Dev app stopped. Exit code: {code}")
                self.status_var.set("Dev app stopped.")
        except Exception:
            self.dev_process = None
            self.dev_status_var.set("Dev app handle cleared.")

    def stop_dev_app(self):
        if not self.dev_process:
            self.dev_status_var.set("Dev app is not running.")
            return

        try:
            if self.dev_process.poll() is not None:
                self.dev_process = None
                self.dev_status_var.set("Dev app is not running.")
                return
        except Exception:
            self.dev_process = None
            self.dev_status_var.set("Invalid dev app handle cleared.")
            return

        try:
            if os.name == "nt":
                try:
                    self.dev_process.send_signal(signal.CTRL_BREAK_EVENT)
                    time.sleep(0.8)
                except Exception:
                    pass

                if self.dev_process and self.dev_process.poll() is None:
                    self.dev_process.terminate()

                time.sleep(0.8)

                if self.dev_process and self.dev_process.poll() is None:
                    self.dev_process.kill()
            else:
                self.dev_process.terminate()
                time.sleep(0.8)

                if self.dev_process.poll() is None:
                    self.dev_process.kill()

            self.dev_process = None
            self.dev_status_var.set("Dev app stopped.")
            self.status_var.set("Dev app stopped.")

        except Exception as exc:
            self.dev_process = None
            self.dev_status_var.set("Dev app handle cleared after stop error.")
            messagebox.showwarning(
                "Dev app handle cleared",
                f"The stored process handle was invalid or could not be stopped cleanly.\n\n{exc}\n\n"
                "If the server is still running, close the Command Prompt window or use Kill Node on 5173."
            )

    def restart_dev_app(self):
        self.stop_dev_app()
        self.after(1000, self.start_dev_app)

    def open_browser_if_running(self):
        if self.dev_process:
            try:
                if self.dev_process.poll() is None:
                    self.open_browser()
            except Exception:
                self.dev_process = None

    def open_browser(self):
        url = self.dev_url_var.get().strip() or "http://localhost:5173"
        webbrowser.open(url)

    def kill_port_5173(self):
        proceed = messagebox.askyesno(
            "Kill Node on port 5173",
            "This will try to find and kill the process listening on port 5173.\n\n"
            "Continue?"
        )

        if not proceed:
            return

        if os.name != "nt":
            self.run_command_capture("lsof -ti:5173 | xargs kill -9", Path.cwd(), self.dev_status_var)
            self.dev_process = None
            return

        command = (
            'for /f "tokens=5" %a in (\'netstat -ano ^| findstr :5173 ^| findstr LISTENING\') '
            'do taskkill /PID %a /F'
        )

        project_root = self.validate_project_root() or Path.cwd()
        self.run_command_capture(command, project_root, self.dev_status_var)
        self.dev_process = None

    def on_close(self):
        if self.dev_process:
            try:
                running = self.dev_process.poll() is None
            except Exception:
                running = False
                self.dev_process = None

            if running:
                proceed = messagebox.askyesno(
                    "Dev app is still running",
                    "The dev app is still running. Stop it before closing?"
                )

                if proceed:
                    self.stop_dev_app()

        self.cleanup_temp_dir()
        self.destroy()


def main():
    app = ZipToSrcInstaller()
    app.mainloop()


if __name__ == "__main__":
    main()
