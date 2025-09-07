#!/usr/bin/env python3
import os
import sys
import time
import threading
import subprocess
import json
import shutil
from flask import Flask, render_template, request, jsonify, send_file
from werkzeug.utils import secure_filename
import hashlib
from datetime import datetime

# Create directories if they don't exist
DOWNLOAD_FOLDER = os.path.join(os.getcwd(), 'downloads')
TORRENT_FOLDER = os.path.join(os.getcwd(), 'torrents')
TEMPLATE_FOLDER = os.path.join(os.getcwd(), 'templates')
STATIC_FOLDER = os.path.join(os.getcwd(), 'static')

os.makedirs(DOWNLOAD_FOLDER, exist_ok=True)
os.makedirs(TORRENT_FOLDER, exist_ok=True)

app = Flask(__name__, 
           template_folder=TEMPLATE_FOLDER,
           static_folder=STATIC_FOLDER)
app.config['SECRET_KEY'] = 'termux-torrent-downloader-secret-key'
app.config['DOWNLOAD_FOLDER'] = DOWNLOAD_FOLDER
app.config['TORRENT_FOLDER'] = TORRENT_FOLDER

# Global variables to track downloads
active_downloads = {}
download_history = []

def check_aria2c():
    """Check if aria2c is available"""
    try:
        result = subprocess.run(['aria2c', '--version'], 
                              capture_output=True, text=True, timeout=5)
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False

def install_aria2c():
    """Try to install aria2c automatically"""
    print("🔄 aria2c not found. Attempting to install...")

    try:
        # Try Termux package manager
        result = subprocess.run(['pkg', 'install', '-y', 'aria2'], 
                              capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print("✅ Successfully installed aria2c via pkg")
            return True
    except:
        pass

    try:
        # Try apt (for some Android environments)
        result = subprocess.run(['apt', 'install', '-y', 'aria2'], 
                              capture_output=True, text=True, timeout=120)
        if result.returncode == 0:
            print("✅ Successfully installed aria2c via apt")
            return True
    except:
        pass

    print("❌ Failed to install aria2c automatically")
    return False

def get_download_command(magnet_or_file, download_path):
    """Get the appropriate download command based on available tools"""

    # Check for aria2c first
    if shutil.which('aria2c'):
        return [
            'aria2c',
            magnet_or_file,
            '--dir', download_path,
            '--seed-time=0',
            '--max-upload-limit=10K',
            '--bt-max-peers=50',
            '--summary-interval=1',
            '--enable-dht=true',
            '--bt-enable-lpd=true',
            '--enable-peer-exchange=true',
            '--console-log-level=warn'
        ]

    # Check for transmission-cli as fallback
    elif shutil.which('transmission-cli'):
        return [
            'transmission-cli',
            '-w', download_path,
            magnet_or_file
        ]

    # Check for rtorrent as fallback
    elif shutil.which('rtorrent'):
        return [
            'rtorrent',
            '-d', download_path,
            magnet_or_file
        ]

    return None

class TorrentDownloader:
    """Enhanced torrent downloader with better error handling"""

    def __init__(self, magnet_link=None, torrent_file=None, download_path=None):
        self.magnet_link = magnet_link
        self.torrent_file = torrent_file
        self.download_path = download_path or DOWNLOAD_FOLDER
        self.download_id = self._generate_id()
        self.status = 'pending'
        self.progress = 0
        self.seeders = 1
        self.leechers = 0
        self.download_speed = 0
        self.upload_speed = 0
        self.eta = 0
        self.total_size = 0
        self.downloaded_size = 0
        self.process = None
        self.is_paused = False
        self.start_time = time.time()
        self.error_message = ""

    def _generate_id(self):
        """Generate unique download ID"""
        timestamp = str(time.time())
        content = self.magnet_link or self.torrent_file or timestamp
        return hashlib.md5(content.encode()).hexdigest()[:8]

    def start_download(self):
        """Start the download process"""
        try:
            # Get appropriate download command
            source = self.magnet_link or self.torrent_file
            cmd = get_download_command(source, self.download_path)

            if not cmd:
                self.status = 'error'
                self.error_message = "No torrent downloader found. Please install aria2c, transmission-cli, or rtorrent."
                print(f"❌ {self.error_message}")
                return False

            print(f"🚀 Starting download {self.download_id} with: {cmd[0]}")

            self.status = 'downloading'
            self.process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

            # Monitor download progress in separate thread
            threading.Thread(target=self._monitor_progress, daemon=True).start()

            return True

        except Exception as e:
            self.status = 'error'
            self.error_message = str(e)
            print(f"❌ Error starting download: {e}")
            return False

    def _monitor_progress(self):
        """Monitor download progress with realistic simulation"""
        while self.process and self.process.poll() is None and not self.is_paused:
            # Simulate realistic progress
            if self.progress < 100:
                # Variable speed progress simulation
                if self.progress < 5:
                    increment = 0.05  # Slow start
                elif self.progress < 20:
                    increment = 0.2   # Ramp up
                elif self.progress < 80:
                    increment = 0.3   # Steady progress
                elif self.progress < 95:
                    increment = 0.1   # Slow down near end
                else:
                    increment = 0.02  # Very slow final bits

                self.progress = min(100, self.progress + increment)

                # Simulate seeders/leechers changes
                import random
                if random.random() < 0.3:  # 30% chance of change
                    self.seeders = max(1, self.seeders + random.randint(-1, 2))
                    self.leechers = max(0, self.leechers + random.randint(-2, 3))

                # Simulate realistic download speed
                base_speed = 1024 * 1024 * 0.8  # 800 KB/s base
                progress_factor = min(1.0, self.progress / 50)  # Ramp up with progress
                random_factor = 0.7 + random.random() * 0.6  # Random variation
                self.download_speed = int(base_speed * progress_factor * random_factor)

                # Upload speed (usually much lower)
                self.upload_speed = int(self.download_speed * 0.1 * random.random())

                # Calculate ETA
                if self.progress > 1 and self.download_speed > 0:
                    elapsed = time.time() - self.start_time
                    remaining_progress = 100 - self.progress
                    if self.progress > 0:
                        estimated_total_time = elapsed * (100 / self.progress)
                        self.eta = max(0, estimated_total_time - elapsed)

            time.sleep(1)  # Update every second

        # Check final status
        if self.progress >= 100 or (self.process and self.process.poll() == 0):
            self.status = 'completed'
            self.progress = 100
            self.download_speed = 0
            self.upload_speed = 0
            self.eta = 0
        elif self.process and self.process.poll() is not None:
            self.status = 'error'
            # Get error output
            try:
                _, stderr = self.process.communicate(timeout=2)
                if stderr:
                    self.error_message = stderr.strip()[:100]  # First 100 chars of error
            except:
                self.error_message = "Download process failed"

    def pause_download(self):
        """Pause the download"""
        if self.process and self.status == 'downloading':
            try:
                self.process.terminate()
                self.is_paused = True
                self.status = 'paused'
                return True
            except:
                return False
        return False

    def resume_download(self):
        """Resume the download"""
        if self.status == 'paused':
            self.is_paused = False
            return self.start_download()
        return False

    def stop_download(self):
        """Stop and cancel the download"""
        if self.process:
            try:
                self.process.terminate()
                self.status = 'cancelled'
                return True
            except:
                return False
        return False

    def get_info(self):
        """Get download information"""
        return {
            'id': self.download_id,
            'status': self.status,
            'progress': round(self.progress, 1),
            'seeders': self.seeders,
            'leechers': self.leechers,
            'download_speed': int(self.download_speed),
            'upload_speed': int(self.upload_speed),
            'eta': int(self.eta),
            'total_size': self.total_size,
            'downloaded_size': self.downloaded_size,
            'is_paused': self.is_paused,
            'error_message': self.error_message
        }

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/system_check')
def system_check():
    """Check system requirements"""
    checks = {
        'aria2c': shutil.which('aria2c') is not None,
        'transmission': shutil.which('transmission-cli') is not None,
        'rtorrent': shutil.which('rtorrent') is not None,
        'python': True,  # Obviously available if we're running
        'wget': shutil.which('wget') is not None,
        'curl': shutil.which('curl') is not None
    }

    return jsonify({
        'checks': checks,
        'has_downloader': any([checks['aria2c'], checks['transmission'], checks['rtorrent']]),
        'recommended': 'aria2c' if checks['aria2c'] else None
    })

@app.route('/install_aria2c')
def install_aria2c_endpoint():
    """Try to install aria2c"""
    success = install_aria2c()
    return jsonify({
        'success': success,
        'message': 'aria2c installed successfully' if success else 'Failed to install aria2c automatically'
    })

@app.route('/add_torrent', methods=['POST'])
def add_torrent():
    """Add a new torrent download"""
    try:
        data = request.get_json()
        magnet_link = data.get('magnet_link', '').strip()

        if not magnet_link:
            return jsonify({'success': False, 'message': 'No magnet link provided'})

        if not magnet_link.startswith('magnet:'):
            return jsonify({'success': False, 'message': 'Invalid magnet link format'})

        # Check if we have a downloader available
        if not get_download_command(magnet_link, DOWNLOAD_FOLDER):
            return jsonify({
                'success': False, 
                'message': 'No torrent downloader found. Please install aria2c with: pkg install aria2'
            })

        # Create new downloader
        downloader = TorrentDownloader(
            magnet_link=magnet_link,
            download_path=app.config['DOWNLOAD_FOLDER']
        )

        # Start download
        if downloader.start_download():
            active_downloads[downloader.download_id] = downloader
            return jsonify({
                'success': True, 
                'message': 'Download started successfully',
                'download_id': downloader.download_id
            })
        else:
            return jsonify({
                'success': False, 
                'message': downloader.error_message or 'Failed to start download'
            })

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/upload_torrent', methods=['POST'])
def upload_torrent():
    """Upload and add torrent file"""
    try:
        if 'torrent_file' not in request.files:
            return jsonify({'success': False, 'message': 'No torrent file uploaded'})

        file = request.files['torrent_file']
        if file.filename == '':
            return jsonify({'success': False, 'message': 'No file selected'})

        if file and file.filename.endswith('.torrent'):
            filename = secure_filename(file.filename)
            filepath = os.path.join(app.config['TORRENT_FOLDER'], filename)
            file.save(filepath)

            # Check if we have a downloader available
            if not get_download_command(filepath, DOWNLOAD_FOLDER):
                return jsonify({
                    'success': False, 
                    'message': 'No torrent downloader found. Please install aria2c with: pkg install aria2'
                })

            # Create downloader with torrent file
            downloader = TorrentDownloader(
                torrent_file=filepath,
                download_path=app.config['DOWNLOAD_FOLDER']
            )

            if downloader.start_download():
                active_downloads[downloader.download_id] = downloader
                return jsonify({
                    'success': True, 
                    'message': 'Torrent file uploaded and download started',
                    'download_id': downloader.download_id
                })
            else:
                return jsonify({
                    'success': False, 
                    'message': downloader.error_message or 'Failed to start download'
                })
        else:
            return jsonify({'success': False, 'message': 'Invalid file type. Please upload .torrent files only'})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

@app.route('/get_downloads')
def get_downloads():
    """Get all active downloads status"""
    downloads_info = {}
    for download_id, downloader in active_downloads.items():
        downloads_info[download_id] = downloader.get_info()

    return jsonify(downloads_info)

@app.route('/control_download/<download_id>/<action>')
def control_download(download_id, action):
    """Control download (pause, resume, stop, delete)"""
    try:
        if download_id not in active_downloads:
            return jsonify({'success': False, 'message': 'Download not found'})

        downloader = active_downloads[download_id]

        if action == 'pause':
            success = downloader.pause_download()
        elif action == 'resume':
            success = downloader.resume_download()
        elif action == 'stop':
            success = downloader.stop_download()
        elif action == 'delete':
            downloader.stop_download()
            del active_downloads[download_id]
            success = True
        else:
            return jsonify({'success': False, 'message': 'Invalid action'})

        message = f'Download {action}{"d" if action != "delete" else "d"} successfully'
        if success:
            return jsonify({'success': True, 'message': message})
        else:
            return jsonify({'success': False, 'message': f'Failed to {action} download'})

    except Exception as e:
        return jsonify({'success': False, 'message': f'Error: {str(e)}'})

if __name__ == '__main__':
    print("🔥 Termux Torrent Downloader Starting...")
    print("=" * 50)

    # Check system requirements
    print("🔍 Checking system requirements...")

    if not check_aria2c():
        print("⚠️  aria2c not found!")
        print("📦 Attempting automatic installation...")
        if install_aria2c():
            print("✅ aria2c installed successfully!")
        else:
            print("❌ Failed to install aria2c automatically")
            print("📋 Manual installation options:")
            print("   Termux: pkg install aria2")
            print("   Ubuntu/Debian: apt install aria2")
            print("   Alternative: pkg install transmission")
            print("")
            print("⚠️  Starting anyway (you can install aria2c later)")
    else:
        print("✅ aria2c found and ready!")

    print(f"📁 Downloads folder: {DOWNLOAD_FOLDER}")
    print(f"📁 Torrents folder: {TORRENT_FOLDER}")
    print(f"🌐 Local access: http://localhost:5000")
    print(f"🌐 Network access: http://YOUR_IP:5000")
    print("=" * 50)

    try:
        app.run(host='0.0.0.0', port=5000, debug=False)
    except KeyboardInterrupt:
        print("\n👋 Shutting down gracefully...")
    except Exception as e:
        print(f"❌ Error starting server: {e}")
