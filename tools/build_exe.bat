@echo off
rem Builds "Portfolio Editor.exe" next to this script's parent folder.
rem Needs Python 3 with PyInstaller:  python -m pip install pyinstaller
cd /d "%~dp0"
python -m PyInstaller --noconfirm --onefile --windowed --name "Portfolio Editor" --distpath ".." --workpath "build" --specpath "build" portfolio_editor.py
echo.
echo Built: "%~dp0..\Portfolio Editor.exe"
pause
