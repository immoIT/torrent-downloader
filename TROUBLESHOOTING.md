# 🔧 Termux Torrent Downloader - Troubleshooting Guide

## ❌ "aria2c not found" Error

This is the most common issue. The torrent downloader needs aria2c to function.

### 🚀 Quick Fixes:

#### 1. **Automatic Installation (Recommended)**
```bash
./install.sh
```
The installation script will automatically try to install aria2c.

#### 2. **Manual Installation**
```bash
# Update package list
pkg update

# Install aria2c
pkg install aria2

# Verify installation
aria2c --version
```

#### 3. **Alternative: Use our built-in installer**
- Start the app: `python app.py`
- Open web interface: `http://localhost:5000`
- Click "System" button to check status
- Click "Try Auto-Install" if aria2c is missing

### 🔄 Alternative Downloaders

If aria2c doesn't work, try these alternatives:

#### Transmission CLI
```bash
pkg install transmission
```

#### rtorrent
```bash
pkg install rtorrent
```

The app will automatically detect and use available downloaders.

## 🌐 Network & Access Issues

### Can't access from other devices?

1. **Check your phone's IP address:**
```bash
# Method 1
ip addr show wlan0

# Method 2  
ifconfig wlan0

# Method 3
hostname -I
```

2. **Use the correct URL format:**
```
http://YOUR_PHONE_IP:5000
```
Example: `http://192.168.1.100:5000`

3. **Ensure devices are on same WiFi network**

4. **Check if port 5000 is blocked:**
Try a different port by editing `app.py`:
```python
app.run(host='0.0.0.0', port=8080, debug=False)  # Change to 8080
```

### Port already in use?

```bash
# Find what's using port 5000
netstat -tulpn | grep :5000

# Kill the process (replace PID with actual process ID)
kill -9 PID

# Or use a different port in app.py
```

## 📱 Termux-Specific Issues

### Permission denied?

```bash
# Set up Termux storage access
termux-setup-storage

# Make scripts executable
chmod +x install.sh
chmod +x app.py
chmod +x cli_downloader.py
```

### Python or pip not found?

```bash
# Install Python
pkg install python

# Install pip
pkg install python-pip

# Verify installation
python --version
pip --version
```

### Flask not found?

```bash
# Install Flask
pip install Flask Werkzeug

# Or use the requirements file
pip install -r requirements.txt
```

## 🔍 Download Issues

### Downloads not starting?

1. **Check magnet link format:**
   - Must start with `magnet:`
   - Should contain `xt=urn:btih:`

2. **Verify system status:**
   - Open web interface
   - Click "System" button
   - Ensure aria2c is installed

3. **Check error messages:**
   - Look for red error messages under downloads
   - Check terminal output for detailed errors

### Downloads stuck at 0%?

1. **Network connectivity:**
```bash
# Test internet connection
ping google.com

# Check DNS
nslookup google.com
```

2. **Magnet link issues:**
   - Try a different magnet link
   - Ensure the torrent has active seeders

3. **Firewall/Router issues:**
   - Some networks block P2P traffic
   - Try mobile data to test

### Can't pause/resume downloads?

This is normal behavior - the current implementation shows simulated progress for demonstration. In a production environment, you would:

1. Parse aria2c's actual output
2. Use aria2c's RPC interface
3. Implement proper state management

## 📁 File & Directory Issues

### Downloads folder not created?

The app automatically creates directories, but if there are issues:

```bash
# Create manually
mkdir -p downloads torrents templates static

# Set permissions
chmod 755 downloads torrents
```

### Can't find downloaded files?

```bash
# Check downloads directory
ls -la downloads/

# Find files by name
find . -name "*.mp4" -o -name "*.mkv" -o -name "*.avi"
```

## 🐛 App Startup Issues

### Template not found error?

```bash
# Ensure proper directory structure
ls -la templates/
ls -la static/

# If missing, re-extract the project or run install.sh
```

### Import errors?

```bash
# Install missing packages
pip install Flask Werkzeug

# If using Python 3 specifically
pip3 install Flask Werkzeug

# Update pip if needed
pip install --upgrade pip
```

### "Address already in use" error?

```bash
# Find the process using port 5000
lsof -i :5000

# Kill it
pkill -f "python app.py"

# Or change the port in app.py
```

## 💡 Performance Optimization

### App running slowly?

1. **Reduce update frequency:**
   Edit `static/script.js` and change update intervals:
   ```javascript
   updateInterval = setInterval(loadDownloads, 5000); // 5 seconds instead of 3
   ```

2. **Limit concurrent downloads:**
   Keep only 1-2 active downloads at once

3. **Close other apps:**
   Free up RAM and CPU on your device

### Battery optimization?

1. **Use Termux:Boot** to start the service automatically
2. **Disable battery optimization** for Termux in Android settings
3. **Use a Wake Lock app** to prevent the device from sleeping

## 🛠️ Advanced Troubleshooting

### Enable debug mode:

Edit `app.py` and change:
```python
app.run(host='0.0.0.0', port=5000, debug=True)  # Enable debug
```

### Check logs:

```bash
# Run with verbose output
python app.py 2>&1 | tee app.log

# Monitor logs in real-time
tail -f app.log
```

### Reset everything:

```bash
# Stop the app
pkill -f "python app.py"

# Remove generated files
rm -rf downloads/* torrents/*

# Restart
python app.py
```

## 📞 Getting Help

### Check system status first:
1. Open `http://localhost:5000`
2. Click "System" button
3. Review the status report

### Gather information:
```bash
# System info
uname -a

# Python version
python --version

# Package versions
pkg list-installed | grep -E "(aria2|python|flask)"

# Network status
ip addr show
```

### Common working configurations:

**Termux on Android 10+:**
- pkg install python aria2
- pip install Flask Werkzeug
- python app.py

**Termux on Android 7-9:**
- May need: pkg install python2 python2-dev
- Use: python2 app.py

## ✅ Verification Steps

After installation, verify everything works:

1. **Check aria2c:**
```bash
aria2c --version
```

2. **Check Python packages:**
```bash
python -c "import flask; print('Flask:', flask.__version__)"
```

3. **Test the app:**
```bash
python app.py
# Should show: "🔥 Termux Torrent Downloader Starting..."
```

4. **Test web interface:**
- Open: `http://localhost:5000`
- Should see: Modern web interface with no error messages

5. **Test system check:**
- Click "System" button
- Should show: ✅ aria2c found and ready

---

## 🎯 Still Having Issues?

1. **Re-run the installation:**
```bash
./install.sh
```

2. **Try the CLI version:**
```bash
python cli_downloader.py --help
```

3. **Check the README.md** for additional information

4. **Verify your Termux version** is up to date

Remember: This is a development/demonstration version. For production use, consider implementing proper torrent client integration with libraries like `libtorrent-python` or using aria2c's RPC interface.

---

**Happy torrenting! 🚀**
