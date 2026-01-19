#!/bin/bash

# Warna untuk tampilan
CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${CYAN}--- AYARA BOT INSTALLER FOR TERMUX ---${NC}"

# 1. Update & Upgrade
echo -e "${GREEN}[1/5] Memperbarui package Termux...${NC}"
pkg update -y && pkg upgrade -y

# 2. Install Node.js & Git
echo -e "${GREEN}[2/5] Menginstall Node.js, Git, dan ImageMagick...${NC}"
pkg install nodejs git imagemagick ffmpeg -y

# 3. Membuat folder database
echo -e "${GREEN}[3/5] Membuat struktur folder...${NC}"
mkdir -p database
mkdir -p media

# 4. Install Dependensi
echo -e "${GREEN}[4/5] Menginstall library (npm)...${NC}"
npm install

# 5. Selesai
echo -e "${CYAN}---------------------------------------${NC}"
echo -e "${GREEN}Instalasi Selesai!${NC}"
echo -e "Untuk menjalankan bot, ketik: ${RED}node index.js${NC}"
echo -e "${CYAN}---------------------------------------${NC}"