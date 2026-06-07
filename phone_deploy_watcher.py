import os
import sys
import time
import json
import shutil
import zipfile
import queue
import threading
import subprocess
import tempfile
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from datetime import datetime
from pathlib import Path


APP_NAME = "Phone Deploy Watcher"
CONFIG_FILE = Path.home() / ".phone_deploy_watcher.json"


DEFAULT_CONFIG = {
    "watch_folder": str(Path.home() / "Downloads" / "PhoneDeploy"),
    "project_root": str(Path.home() / "Documents" / "kuhlwaregames"),
    "src_destination": str(Path.home() / "Documents" / "kuhlwaregames" / "src"),
    "build_command": "npm run build",
    "deploy_command": "firebase deploy",
    "firebase_hosting_only": True,
    "firebase_non_interactive": True,
    "delete_zip_after_success": True,
    "auto_start_watching": False,
    "poll_seconds": 3,
    "stable_checks": 3,
    "stable_delay_seconds": 1,
}


def now_text():
    return datetime.now().strftime("%Y-%m-%d %H:%M:%S")


def load_config():
    if CONFIG_FILE.exists():
        try:
            with CONFIG_FILE.open("r", encoding="utf-8") as f:
                data = json.load(f)

            merged = DEFAULT_CONFIG.copy()
            merged.update(data)

            # Upgrade old configs from v1/v2.
            # v2 may have stored "firebase deploy --only hosting --non-interactive".
            deploy_command = str(merged.get("deploy_command", "")).strip()
            lower_deploy_command = deploy_command.lower()

            if lower_deploy_command.startswith("firebase deploy"):
                if "--only hosting" in lower_deploy_command:
                    merged["firebase_hosting_only"] = True
                if "--non-interactive" in lower_deploy_command:
                    merged["firebase_non_interactive"] = True

                # Keep the visible command clean and let checkboxes control flags.
                cleaned = deploy_command
                cleaned = cleaned.replace("--only hosting", "")
                cleaned = cleaned.replace("--non-interactive", "")
                cleaned = " ".join(cleaned.split())
                if cleaned.lower() == "firebase deploy":
                    merged["deploy_command"] = "firebase deploy"

            return merged

        except Exception:
            return DEFAULT_CONFIG.copy()

    return DEFAULT_CONFIG.copy()


def save_config(config):
    CONFIG_FILE.parent.mkdir(parents=True, exist_ok=True)
    with CONFIG_FILE.open("w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)


def is_relative_to(child, parent):
    try:
        Path(child).resolve().relative_to(Path(parent).resolve())
        return True
    except ValueError:
        return False


def safe_extract_zip(zip_path, destination):
    """
    Extract a ZIP safely, preventing files from escaping the staging folder.
    """
    zip_path = Path(zip_path)
    destination = Path(destination)
    destination.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_path, "r") as zf:
        for member in zf.infolist():
            member_path = destination / member.filename
            resolved_member = member_path.resolve()
            resolved_dest = destination.resolve()

            if not is_relative_to(resolved_member, resolved_dest):
                raise RuntimeError(f"Unsafe ZIP path blocked: {member.filename}")

        zf.extractall(destination)


def copy_folder_contents(source_folder, destination_folder):
    """
    Copy contents of source_folder into destination_folder.
    Existing files are overwritten.
    Existing folders are merged.
    """
    source_folder = Path(source_folder)
    destination_folder = Path(destination_folder)
    destination_folder.mkdir(parents=True, exist_ok=True)

    for item in source_folder.iterdir():
        target = destination_folder / item.name

        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(item, target)


def find_effective_zip_root(staging_folder):
    """
    The ZIP files produced for this workflow are based on the src directory.

    Expected examples:
      ZIP contains:
        games/five-parsecs/view.jsx
        games/five-parsecs/rules.js

      Or ZIP contains one wrapper folder:
        src/games/five-parsecs/view.jsx
        src/games/five-parsecs/rules.js

    This function returns the folder whose contents should be copied into <project>/src.
    """
    staging_folder = Path(staging_folder)

    children = list(staging_folder.iterdir())

    # If the ZIP has a single top-level folder named src, use that folder.
    if len(children) == 1 and children[0].is_dir() and children[0].name.lower() == "src":
        return children[0]

    # If the ZIP has a single wrapper folder and inside it has src, use wrapper/src.
    if len(children) == 1 and children[0].is_dir():
        possible_src = children[0] / "src"
        if possible_src.exists() and possible_src.is_dir():
            return possible_src

    # Otherwise, assume the extracted contents are already relative to src.
    return staging_folder


def normalize_firebase_deploy_command(command, firebase_hosting_only, firebase_non_interactive):
    """
    Build the final Firebase deploy command.

    Why this exists:
      - Hosting-only deploys are safest for normal phone updates that only change src.
      - Full Firebase deploys are sometimes needed if the project changes firestore.rules,
        firestore.indexes.json, storage.rules, functions, etc.
      - Non-interactive mode prevents the watcher from hanging on CLI prompts.

    Recommended normal command:
      firebase deploy
      with:
        Hosting only: ON
        Non-interactive: ON

    Recommended full Firebase command:
      firebase deploy
      with:
        Hosting only: OFF
        Non-interactive: ON

    Important:
      Full deploy + non-interactive will fail instead of asking questions.
      That is safer than hanging or accidentally deleting indexes.
    """
    command = command.strip()

    if not command:
        return command

    lower_command = command.lower()

    if lower_command.startswith("firebase deploy"):
        if firebase_hosting_only and "--only" not in lower_command:
            command += " --only hosting"

        if firebase_non_interactive and "--non-interactive" not in lower_command:
            command += " --non-interactive"

    return command


def run_command(command, working_directory, log_callback, firebase_hosting_only=False, firebase_non_interactive=False):
    """
    Run a shell command and stream output to the UI log.
    Returns the process return code.
    """
    command = normalize_firebase_deploy_command(
        command,
        firebase_hosting_only=firebase_hosting_only,
        firebase_non_interactive=firebase_non_interactive,
    )

    log_callback(f"Running command from {working_directory}: {command}")

    env = os.environ.copy()

    if firebase_non_interactive:
        env["CI"] = "true"

    stdin_setting = subprocess.DEVNULL if firebase_non_interactive else None

    process = subprocess.Popen(
        command,
        cwd=str(working_directory),
        shell=True,
        stdin=stdin_setting,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        env=env,
    )

    if process.stdout:
        for line in process.stdout:
            log_callback(line.rstrip())

    return process.wait()


def file_size(path):
    try:
        return Path(path).stat().st_size
    except FileNotFoundError:
        return -1


def wait_for_file_to_finish_copying(path, stable_checks, stable_delay_seconds, log_callback):
    """
    Quick Share or another transfer tool may create the ZIP before it is fully copied.
    This waits until the file size is unchanged for several checks.
    """
    path = Path(path)
    last_size = -1
    stable_count = 0

    log_callback(f"Waiting for ZIP to finish copying: {path.name}")

    while stable_count < stable_checks:
        current_size = file_size(path)

        if current_size <= 0:
            stable_count = 0
        elif current_size == last_size:
            stable_count += 1
        else:
            stable_count = 0

        last_size = current_size
        time.sleep(stable_delay_seconds)

    log_callback(f"ZIP appears stable: {path.name}")


class DeployWorker:
    def __init__(self, config, log_callback, status_callback):
        self.config = config
        self.log_callback = log_callback
        self.status_callback = status_callback
        self.stop_event = threading.Event()
        self.thread = None
        self.processing_lock = threading.Lock()
        self.processed_this_session = set()

    def start(self):
        if self.thread and self.thread.is_alive():
            return

        self.stop_event.clear()
        self.thread = threading.Thread(target=self.watch_loop, daemon=True)
        self.thread.start()

    def stop(self):
        self.stop_event.set()

    def log(self, message):
        self.log_callback(message)

    def status(self, message):
        self.status_callback(message)

    def watch_loop(self):
        watch_folder = Path(self.config["watch_folder"])

        watch_folder.mkdir(parents=True, exist_ok=True)

        self.status("Watching")
        self.log(f"Watching folder: {watch_folder}")

        while not self.stop_event.is_set():
            try:
                zip_files = sorted(
                    watch_folder.glob("*.zip"),
                    key=lambda p: p.stat().st_mtime
                )

                for zip_path in zip_files:
                    if self.stop_event.is_set():
                        break

                    if zip_path.name in self.processed_this_session:
                        continue

                    failed_marker = zip_path.with_suffix(zip_path.suffix + ".failed.txt")
                    working_marker = zip_path.with_suffix(zip_path.suffix + ".working.txt")

                    if failed_marker.exists():
                        continue

                    if working_marker.exists():
                        # If the program was killed during a prior run, do not assume success.
                        # Remove stale marker and try again.
                        try:
                            working_marker.unlink()
                        except Exception:
                            pass

                    self.process_zip(zip_path)

            except Exception as e:
                self.log(f"Watcher error: {e}")

            time.sleep(float(self.config.get("poll_seconds", 3)))

        self.status("Stopped")
        self.log("Watcher stopped.")

    def process_zip(self, zip_path):
        with self.processing_lock:
            zip_path = Path(zip_path)
            self.processed_this_session.add(zip_path.name)

            project_root = Path(self.config["project_root"])
            src_destination = Path(self.config["src_destination"])

            failed_marker = zip_path.with_suffix(zip_path.suffix + ".failed.txt")
            working_marker = zip_path.with_suffix(zip_path.suffix + ".working.txt")

            try:
                self.status(f"Processing {zip_path.name}")
                self.log("")
                self.log("=" * 80)
                self.log(f"Found ZIP: {zip_path.name}")

                if not project_root.exists():
                    raise RuntimeError(f"Project root does not exist: {project_root}")

                if not src_destination.exists():
                    src_destination.mkdir(parents=True, exist_ok=True)

                if not is_relative_to(src_destination, project_root):
                    raise RuntimeError(
                        "Source destination must be inside the project root.\n"
                        f"Project root: {project_root}\n"
                        f"Source destination: {src_destination}"
                    )

                working_marker.write_text(
                    f"Processing started {now_text()}\n",
                    encoding="utf-8"
                )

                wait_for_file_to_finish_copying(
                    zip_path,
                    int(self.config.get("stable_checks", 3)),
                    float(self.config.get("stable_delay_seconds", 1)),
                    self.log,
                )

                with tempfile.TemporaryDirectory(prefix="phone_deploy_") as temp_dir:
                    staging_folder = Path(temp_dir) / "staging"
                    staging_folder.mkdir(parents=True, exist_ok=True)

                    self.log(f"Extracting to staging folder: {staging_folder}")
                    safe_extract_zip(zip_path, staging_folder)

                    effective_root = find_effective_zip_root(staging_folder)
                    self.log(f"Copying staged contents from: {effective_root}")
                    self.log(f"Copying into src destination: {src_destination}")

                    copy_folder_contents(effective_root, src_destination)

                build_command = self.config["build_command"].strip()
                deploy_command = self.config["deploy_command"].strip()

                firebase_hosting_only = bool(self.config.get("firebase_hosting_only", True))
                firebase_non_interactive = bool(self.config.get("firebase_non_interactive", True))

                if build_command:
                    self.status("Building")
                    build_code = run_command(
                        build_command,
                        project_root,
                        self.log,
                        firebase_hosting_only=False,
                        firebase_non_interactive=False,
                    )
                    if build_code != 0:
                        raise RuntimeError(f"Build failed with exit code {build_code}")

                if deploy_command:
                    self.status("Deploying")

                    final_deploy_command = normalize_firebase_deploy_command(
                        deploy_command,
                        firebase_hosting_only=firebase_hosting_only,
                        firebase_non_interactive=firebase_non_interactive,
                    )

                    if firebase_hosting_only:
                        self.log("Firebase deploy mode: Hosting only")
                    else:
                        self.log("Firebase deploy mode: Full Firebase deploy")

                    if firebase_non_interactive:
                        self.log("Firebase prompt handling: Non-interactive, fail instead of asking")
                    else:
                        self.log("Firebase prompt handling: Interactive prompts allowed")

                    deploy_code = run_command(
                        final_deploy_command,
                        project_root,
                        self.log,
                        firebase_hosting_only=False,
                        firebase_non_interactive=False,
                    )

                    if deploy_code != 0:
                        raise RuntimeError(f"Firebase deploy failed with exit code {deploy_code}")

                if self.config.get("delete_zip_after_success", True):
                    self.log(f"Deleting ZIP after successful deploy: {zip_path.name}")
                    zip_path.unlink()
                else:
                    self.log("Delete after success is OFF. ZIP was kept.")

                if working_marker.exists():
                    working_marker.unlink()

                self.status("Watching")
                self.log(f"SUCCESS: {zip_path.name} was copied, built, and deployed.")
                self.log("=" * 80)

            except Exception as e:
                self.status("Failed")
                error_text = (
                    f"Deploy failed for {zip_path.name}\n"
                    f"Time: {now_text()}\n\n"
                    f"{e}\n"
                )
                self.log(f"FAILED: {e}")
                self.log(f"ZIP was kept: {zip_path}")

                try:
                    failed_marker.write_text(error_text, encoding="utf-8")
                except Exception as marker_error:
                    self.log(f"Could not write failed marker: {marker_error}")

                try:
                    if working_marker.exists():
                        working_marker.unlink()
                except Exception:
                    pass

                self.log("=" * 80)


class App(tk.Tk):
    def __init__(self):
        super().__init__()

        self.title(APP_NAME)
        self.geometry("980x760")
        self.minsize(900, 650)

        self.config_data = load_config()
        self.log_queue = queue.Queue()
        self.status_queue = queue.Queue()
        self.worker = None

        self.create_variables()
        self.create_widgets()
        self.load_values_into_widgets()
        self.after(100, self.process_queues)

        if self.config_data.get("auto_start_watching", False):
            self.after(500, self.start_watching)

    def create_variables(self):
        self.watch_folder_var = tk.StringVar()
        self.project_root_var = tk.StringVar()
        self.src_destination_var = tk.StringVar()
        self.build_command_var = tk.StringVar()
        self.deploy_command_var = tk.StringVar()
        self.firebase_hosting_only_var = tk.BooleanVar()
        self.firebase_non_interactive_var = tk.BooleanVar()
        self.delete_zip_after_success_var = tk.BooleanVar()
        self.auto_start_watching_var = tk.BooleanVar()
        self.status_var = tk.StringVar(value="Stopped")

    def create_widgets(self):
        outer = ttk.Frame(self, padding=12)
        outer.pack(fill="both", expand=True)

        title = ttk.Label(
            outer,
            text="Phone Deploy Watcher",
            font=("Segoe UI", 16, "bold")
        )
        title.pack(anchor="w")

        subtitle = ttk.Label(
            outer,
            text="ZIP files are treated as src-based packages. Contents are copied into <Project Root>\\src, then build and Firebase deploy run from the project root."
        )
        subtitle.pack(anchor="w", pady=(2, 12))

        settings = ttk.LabelFrame(outer, text="Settings", padding=10)
        settings.pack(fill="x")

        self.add_path_row(settings, 0, "Watch folder:", self.watch_folder_var, self.browse_watch_folder)
        self.add_path_row(settings, 1, "Project root:", self.project_root_var, self.browse_project_root)
        self.add_path_row(settings, 2, "Source destination:", self.src_destination_var, self.browse_src_destination)

        ttk.Label(settings, text="Build command:").grid(row=3, column=0, sticky="w", padx=(0, 8), pady=4)
        ttk.Entry(settings, textvariable=self.build_command_var).grid(row=3, column=1, sticky="ew", pady=4, columnspan=2)

        ttk.Label(settings, text="Deploy command:").grid(row=4, column=0, sticky="w", padx=(0, 8), pady=4)
        ttk.Entry(settings, textvariable=self.deploy_command_var).grid(row=4, column=1, sticky="ew", pady=4, columnspan=2)

        firebase_options = ttk.LabelFrame(settings, text="Firebase deploy options", padding=8)
        firebase_options.grid(row=5, column=1, sticky="ew", pady=(8, 4), columnspan=2)

        ttk.Checkbutton(
            firebase_options,
            text="Hosting only for normal src updates",
            variable=self.firebase_hosting_only_var
        ).pack(anchor="w")

        ttk.Checkbutton(
            firebase_options,
            text="Non-interactive deploy, fail instead of asking questions",
            variable=self.firebase_non_interactive_var
        ).pack(anchor="w", pady=(4, 0))

        firebase_note = ttk.Label(
            firebase_options,
            text=(
                "Turn Hosting only OFF when your ZIP/update also changes Firebase files such as "
                "firestore.rules, firestore.indexes.json, storage.rules, or functions."
            ),
            wraplength=720,
            foreground="#555555"
        )
        firebase_note.pack(anchor="w", pady=(6, 0))

        ttk.Checkbutton(
            settings,
            text="Delete ZIP only after successful copy, build, and deploy",
            variable=self.delete_zip_after_success_var
        ).grid(row=6, column=1, sticky="w", pady=(8, 2), columnspan=2)

        ttk.Checkbutton(
            settings,
            text="Start watching automatically when program opens",
            variable=self.auto_start_watching_var
        ).grid(row=7, column=1, sticky="w", pady=(2, 8), columnspan=2)

        settings.columnconfigure(1, weight=1)

        controls = ttk.Frame(outer)
        controls.pack(fill="x", pady=12)

        self.start_button = ttk.Button(controls, text="Start Watching", command=self.start_watching)
        self.start_button.pack(side="left")

        self.stop_button = ttk.Button(controls, text="Stop", command=self.stop_watching, state="disabled")
        self.stop_button.pack(side="left", padx=(8, 0))

        ttk.Button(controls, text="Save Settings", command=self.save_settings_from_widgets).pack(side="left", padx=(8, 0))
        ttk.Button(controls, text="Process ZIP Now...", command=self.process_zip_now).pack(side="left", padx=(8, 0))
        ttk.Button(controls, text="Clear Log", command=self.clear_log).pack(side="left", padx=(8, 0))

        status_frame = ttk.Frame(outer)
        status_frame.pack(fill="x", pady=(0, 8))

        ttk.Label(status_frame, text="Status:", font=("Segoe UI", 10, "bold")).pack(side="left")
        ttk.Label(status_frame, textvariable=self.status_var).pack(side="left", padx=(6, 0))

        log_frame = ttk.LabelFrame(outer, text="Log", padding=8)
        log_frame.pack(fill="both", expand=True)

        self.log_text = tk.Text(log_frame, wrap="word", height=20)
        self.log_text.pack(side="left", fill="both", expand=True)

        scrollbar = ttk.Scrollbar(log_frame, orient="vertical", command=self.log_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.log_text.configure(yscrollcommand=scrollbar.set)

        self.protocol("WM_DELETE_WINDOW", self.on_close)

    def add_path_row(self, parent, row, label, variable, command):
        ttk.Label(parent, text=label).grid(row=row, column=0, sticky="w", padx=(0, 8), pady=4)
        ttk.Entry(parent, textvariable=variable).grid(row=row, column=1, sticky="ew", pady=4)
        ttk.Button(parent, text="Browse...", command=command).grid(row=row, column=2, sticky="e", padx=(8, 0), pady=4)

    def load_values_into_widgets(self):
        self.watch_folder_var.set(self.config_data["watch_folder"])
        self.project_root_var.set(self.config_data["project_root"])
        self.src_destination_var.set(self.config_data["src_destination"])
        self.build_command_var.set(self.config_data["build_command"])
        self.deploy_command_var.set(self.config_data["deploy_command"])
        self.firebase_hosting_only_var.set(bool(self.config_data.get("firebase_hosting_only", True)))
        self.firebase_non_interactive_var.set(bool(self.config_data.get("firebase_non_interactive", True)))
        self.delete_zip_after_success_var.set(bool(self.config_data["delete_zip_after_success"]))
        self.auto_start_watching_var.set(bool(self.config_data["auto_start_watching"]))

    def collect_config_from_widgets(self):
        return {
            "watch_folder": self.watch_folder_var.get().strip(),
            "project_root": self.project_root_var.get().strip(),
            "src_destination": self.src_destination_var.get().strip(),
            "build_command": self.build_command_var.get().strip(),
            "deploy_command": self.deploy_command_var.get().strip(),
            "firebase_hosting_only": bool(self.firebase_hosting_only_var.get()),
            "firebase_non_interactive": bool(self.firebase_non_interactive_var.get()),
            "delete_zip_after_success": bool(self.delete_zip_after_success_var.get()),
            "auto_start_watching": bool(self.auto_start_watching_var.get()),
            "poll_seconds": int(self.config_data.get("poll_seconds", 3)),
            "stable_checks": int(self.config_data.get("stable_checks", 3)),
            "stable_delay_seconds": float(self.config_data.get("stable_delay_seconds", 1)),
        }

    def save_settings_from_widgets(self):
        try:
            new_config = self.collect_config_from_widgets()
            self.validate_config(new_config)
            self.config_data = new_config
            save_config(self.config_data)
            self.log(f"Settings saved to {CONFIG_FILE}")
            messagebox.showinfo(APP_NAME, "Settings saved.")
        except Exception as e:
            messagebox.showerror(APP_NAME, str(e))

    def validate_config(self, config):
        watch_folder = Path(config["watch_folder"])
        project_root = Path(config["project_root"])
        src_destination = Path(config["src_destination"])

        if not config["watch_folder"]:
            raise RuntimeError("Watch folder is required.")

        if not config["project_root"]:
            raise RuntimeError("Project root is required.")

        if not config["src_destination"]:
            raise RuntimeError("Source destination is required.")

        if src_destination.name.lower() != "src":
            confirm = messagebox.askyesno(
                APP_NAME,
                "The source destination does not end with a folder named 'src'.\n\n"
                "Your normal workflow expects ZIP files to be based on the src directory.\n\n"
                "Continue anyway?"
            )
            if not confirm:
                raise RuntimeError("Settings were not saved.")

        if project_root.exists() and src_destination.exists():
            if not is_relative_to(src_destination, project_root):
                raise RuntimeError("Source destination must be inside the project root.")

        deploy_command = config.get("deploy_command", "").strip().lower()

        if deploy_command.startswith("firebase deploy"):
            if not config.get("firebase_hosting_only", True) and not config.get("firebase_non_interactive", True):
                confirm = messagebox.askyesno(
                    APP_NAME,
                    "You selected full Firebase deploy with interactive prompts allowed.\n\n"
                    "This can make the watcher stop and wait for questions like deleting indexes.\n\n"
                    "Continue anyway?"
                )
                if not confirm:
                    raise RuntimeError("Settings were not saved.")

        watch_folder.mkdir(parents=True, exist_ok=True)

    def browse_watch_folder(self):
        folder = filedialog.askdirectory(title="Choose folder to watch")
        if folder:
            self.watch_folder_var.set(folder)

    def browse_project_root(self):
        folder = filedialog.askdirectory(title="Choose project root")
        if folder:
            self.project_root_var.set(folder)
            possible_src = Path(folder) / "src"
            self.src_destination_var.set(str(possible_src))

    def browse_src_destination(self):
        folder = filedialog.askdirectory(title="Choose src destination")
        if folder:
            self.src_destination_var.set(folder)

    def start_watching(self):
        try:
            self.save_settings_without_popup()
            self.worker = DeployWorker(
                self.config_data,
                self.threadsafe_log,
                self.threadsafe_status
            )
            self.worker.start()
            self.start_button.configure(state="disabled")
            self.stop_button.configure(state="normal")
        except Exception as e:
            messagebox.showerror(APP_NAME, str(e))

    def stop_watching(self):
        if self.worker:
            self.worker.stop()
            self.worker = None

        self.start_button.configure(state="normal")
        self.stop_button.configure(state="disabled")
        self.status_var.set("Stopped")

    def save_settings_without_popup(self):
        new_config = self.collect_config_from_widgets()
        self.validate_config(new_config)
        self.config_data = new_config
        save_config(self.config_data)

    def process_zip_now(self):
        try:
            self.save_settings_without_popup()

            zip_file = filedialog.askopenfilename(
                title="Choose ZIP to process",
                filetypes=[("ZIP files", "*.zip")]
            )

            if not zip_file:
                return

            worker = DeployWorker(
                self.config_data,
                self.threadsafe_log,
                self.threadsafe_status
            )

            thread = threading.Thread(
                target=worker.process_zip,
                args=(Path(zip_file),),
                daemon=True
            )
            thread.start()

        except Exception as e:
            messagebox.showerror(APP_NAME, str(e))

    def threadsafe_log(self, message):
        self.log_queue.put(message)

    def threadsafe_status(self, message):
        self.status_queue.put(message)

    def process_queues(self):
        while True:
            try:
                message = self.log_queue.get_nowait()
                self.log(message)
            except queue.Empty:
                break

        while True:
            try:
                message = self.status_queue.get_nowait()
                self.status_var.set(message)
            except queue.Empty:
                break

        self.after(100, self.process_queues)

    def log(self, message):
        self.log_text.insert("end", f"[{now_text()}] {message}\n")
        self.log_text.see("end")

    def clear_log(self):
        self.log_text.delete("1.0", "end")

    def on_close(self):
        if self.worker:
            self.worker.stop()
        self.destroy()


def main():
    app = App()
    app.mainloop()


if __name__ == "__main__":
    main()
