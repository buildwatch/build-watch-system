#!/bin/bash
# Script to update Caddyfile with Socket.IO configuration

CADDYFILE="/etc/caddy/Caddyfile"

# Backup current Caddyfile
sudo cp "$CADDYFILE" "$CADDYFILE.backup.$(date +%Y%m%d_%H%M%S)"

# Create updated Caddyfile
sudo tee "$CADDYFILE" > /dev/null << 'EOF'
# Updated Caddyfile for Build Watch LGU
# This adds reverse proxy for API endpoints and Socket.IO WebSocket support

build-watch.com {
    # Socket.IO WebSocket proxy - MUST be before /api/ handle
    handle /socket.io/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }
    
    # Backend API - Route /api/* requests to backend on port 3000
    handle /api/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # File uploads - Route /uploads/* requests to backend
    handle /uploads/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # Frontend - Everything else goes to frontend on port 4321
    reverse_proxy localhost:4321 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}

www.build-watch.com {
    # Socket.IO WebSocket proxy - MUST be before /api/ handle
    handle /socket.io/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
            header_up Connection {>Connection}
            header_up Upgrade {>Upgrade}
        }
    }
    
    # Backend API - Route /api/* requests to backend on port 3000
    handle /api/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # File uploads - Route /uploads/* requests to backend
    handle /uploads/* {
        reverse_proxy localhost:3000 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }
    
    # Frontend - Everything else goes to frontend on port 4321
    reverse_proxy localhost:4321 {
        header_up Host {host}
        header_up X-Real-IP {remote}
        header_up X-Forwarded-For {remote}
        header_up X-Forwarded-Proto {scheme}
    }
}
EOF

echo "✅ Caddyfile updated with Socket.IO configuration"
echo "📋 Next steps:"
echo "   1. Test: sudo caddy validate --config $CADDYFILE"
echo "   2. Reload: sudo systemctl reload caddy"

