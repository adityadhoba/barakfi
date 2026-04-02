#!/bin/bash
# ═══════════════════════════════════════════════════════════
# Barakfi — Local Development Startup
# ═══════════════════════════════════════════════════════════

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}"
echo "  ╔══════════════════════════════════════════╗"
echo "  ║    Barakfi — Dev Server                   ║"
echo "  ╚══════════════════════════════════════════╝"
echo -e "${NC}"

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

# ── 1. Check Python backend ──
echo -e "${YELLOW}[1/4] Setting up backend...${NC}"
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "  Created virtual environment"
fi

source venv/bin/activate
pip install -q -r requirements.txt
echo "  Backend dependencies installed"

# ── 2. Seed database ──
echo -e "${YELLOW}[2/4] Seeding database...${NC}"
python fetch_data.py
echo "  Database seeded"

# ── 3. Check frontend dependencies ──
echo -e "${YELLOW}[3/4] Setting up frontend...${NC}"
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
    echo "  Frontend dependencies installed"
else
    echo "  Frontend dependencies OK"
fi
cd ..

# ── 4. Start both servers ──
echo -e "${YELLOW}[4/4] Starting servers...${NC}"
echo ""
echo -e "  ${GREEN}Backend:${NC}  http://localhost:8001"
echo -e "  ${GREEN}Frontend:${NC} http://localhost:3000"
echo ""

# Start backend in background
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload &
BACKEND_PID=$!

# Start frontend
cd frontend
npm run dev &
FRONTEND_PID=$!

# Trap to clean up on exit
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM

wait
