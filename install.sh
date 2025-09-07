#!/bin/bash

echo "🔥 Installing Termux Torrent Downloader..."
echo "=================================================="

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install aria2c
install_aria2c() {
    echo "📦 Installing aria2c torrent downloader..."

    # Try different package managers
    if command_exists pkg; then
        echo "   Using Termux package manager (pkg)..."
        pkg update -y
        pkg install -y aria2
        if [ $? -eq 0 ]; then
            echo "   ✅ aria2c installed successfully via pkg"
            return 0
        fi
    fi

    if command_exists apt; then
        echo "   Using apt package manager..."
        apt update -y
        apt install -y aria2
        if [ $? -eq 0 ]; then
            echo "   ✅ aria2c installed successfully via apt"
            return 0
        fi
    fi

    if command_exists apt-get; then
        echo "   Using apt-get package manager..."
        apt-get update -y
        apt-get install -y aria2
        if [ $? -eq 0 ]; then
            echo "   ✅ aria2c installed successfully via apt-get"
            return 0
        fi
    fi

    if command_exists yum; then
        echo "   Using yum package manager..."
        yum install -y aria2
        if [ $? -eq 0 ]; then
            echo "   ✅ aria2c installed successfully via yum"
            return 0
        fi
    fi

    echo "   ❌ Failed to install aria2c automatically"
    return 1
}

# Update system packages
echo "📦 Updating system packages..."
if command_exists pkg; then
    pkg update -y
elif command_exists apt; then
    apt update -y
fi

# Install Python and pip
echo "🐍 Installing Python and pip..."
if command_exists pkg; then
    pkg install -y python python-pip
elif command_exists apt; then
    apt install -y python3 python3-pip
    # Create python symlink if it doesn't exist
    if ! command_exists python && command_exists python3; then
        ln -sf $(which python3) /usr/local/bin/python 2>/dev/null || true
    fi
fi

# Install aria2c
if command_exists aria2c; then
    echo "✅ aria2c already installed"
    aria2c --version | head -1
else
    install_aria2c
fi

# Install Python dependencies
echo "📦 Installing Python dependencies..."
if command_exists pip; then
    pip install -r requirements.txt
elif command_exists pip3; then
    pip3 install -r requirements.txt
else
    echo "⚠️  pip not found, trying alternative installation..."
    python -m pip install Flask==2.3.3 Werkzeug==2.3.7 2>/dev/null || python3 -m pip install Flask==2.3.3 Werkzeug==2.3.7
fi

# Create directories
echo "📁 Creating project directories..."
mkdir -p downloads torrents templates static

# Set permissions
echo "🔐 Setting file permissions..."
chmod +x app.py 2>/dev/null || true
chmod +x cli_downloader.py 2>/dev/null || true

# Verify installation
echo ""
echo "🔍 Verifying installation..."
echo "=================================================="

# Check Python
if command_exists python; then
    echo "✅ Python: $(python --version 2>&1)"
elif command_exists python3; then
    echo "✅ Python: $(python3 --version 2>&1)"
else
    echo "❌ Python not found"
fi

# Check Flask
python -c "import flask; print('✅ Flask:', flask.__version__)" 2>/dev/null || python3 -c "import flask; print('✅ Flask:', flask.__version__)" 2>/dev/null || echo "❌ Flask not installed properly"

# Check aria2c
if command_exists aria2c; then
    echo "✅ aria2c: $(aria2c --version | head -1 | cut -d' ' -f3)"
else
    echo "⚠️  aria2c not found - you can install it later with:"
    echo "   pkg install aria2  (Termux)"
    echo "   apt install aria2  (Ubuntu/Debian)"
fi

# Check alternative downloaders
if command_exists transmission-cli; then
    echo "✅ transmission-cli: Available as fallback"
fi

if command_exists wget; then
    echo "✅ wget: Available"
fi

echo ""
echo "=================================================="
echo "✅ Installation completed!"
echo ""
echo "🚀 Quick Start:"
echo "1. Start the server: python app.py"
echo "2. Open browser: http://localhost:5000"
echo "3. Network access: http://$(hostname -I | awk '{print $1}' 2>/dev/null || echo 'YOUR_IP'):5000"
echo ""
echo "📁 Project Structure:"
echo "  📂 downloads/    - Downloaded files"
echo "  📂 torrents/     - Uploaded torrent files"
echo "  📂 templates/    - HTML templates"
echo "  📂 static/       - CSS & JavaScript"
echo ""
echo "🛠️  Usage:"
echo "  🌐 Web Interface: python app.py"
echo "  💻 CLI Tool: python cli_downloader.py 'magnet:?xt=...'"
echo ""
echo "⚠️  If aria2c is missing:"
echo "   The app will try to auto-install it"
echo "   Or manually install: pkg install aria2"
echo ""
echo "🎉 Ready to download torrents!"
echo "=================================================="
