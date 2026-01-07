# WaveSync Production Deployment Guide

## Quick Deploy with Docker Compose

### Prerequisites
- Docker 20.10+
- Docker Compose 2.0+
- Domain name (optional, for HTTPS)
- Spotify Developer App configured

### 1. Configure Environment

Create `server/.env`:
```env
NODE_ENV=production
PORT=4000
SPOTIFY_CLIENT_ID=your_spotify_client_id
REDIS_URL=redis://redis:6379
DB_PATH=/data/wavesync.db
ORIGIN=https://yourdomain.com
```

### 2. Start Services

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Check health
curl http://localhost:4000/health
```

### 3. Configure Domain (Production)

#### A. DNS Records
Point your domain to your server IP:
```
A    yourdomain.com     -> YOUR_SERVER_IP
A    www.yourdomain.com -> YOUR_SERVER_IP
```

#### B. SSL Certificate (Let's Encrypt)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal (add to crontab)
0 3 * * * certbot renew --quiet
```

#### C. Update nginx config
Uncomment HTTPS lines in `nginx/nginx.conf`:
```nginx
listen 443 ssl http2;
ssl_certificate /etc/nginx/ssl/fullchain.pem;
ssl_certificate_key /etc/nginx/ssl/privkey.pem;
```

#### D. Restart nginx
```bash
docker-compose restart nginx
```

### 4. Monitor Services

```bash
# Check all services
docker-compose ps

# View server logs
docker-compose logs -f server

# View nginx access logs
docker-compose logs -f nginx

# Check Redis
docker-compose exec redis redis-cli ping

# Check database
docker-compose exec server ls -lh /data/
```

### 5. Backup

```bash
# Backup database
docker-compose exec server tar -czf /data/backup-$(date +%Y%m%d).tar.gz /data/wavesync.db

# Copy backup to host
docker cp wavesync-server:/data/backup-*.tar.gz ./backups/

# Backup Redis (optional)
docker-compose exec redis redis-cli BGSAVE
```

---

## Manual Deployment (Without Docker)

### Server

```bash
cd server

# Install dependencies
npm ci --production

# Build
npm run build

# Run with PM2
npm install -g pm2
pm2 start dist/server.js --name wavesync-server
pm2 save
pm2 startup
```

### Web Client

```bash
cd web-client

# Install dependencies
npm ci --production

# Build
npm run build

# Serve with nginx or any static server
cp -r dist/* /var/www/wavesync/
```

### nginx Configuration

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        root /var/www/wavesync;
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://localhost:4000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
    }

    location /ws {
        proxy_pass http://localhost:4000/ws;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## CI/CD with GitHub Actions

The project includes `.github/workflows/deploy.yml` for automated deployment.

### Setup Secrets

Add these to your GitHub repository secrets:
- `DOCKER_USERNAME` - Docker Hub username
- `DOCKER_PASSWORD` - Docker Hub password/token
- `DEPLOY_SSH_KEY` - SSH private key for deployment server (optional)

### Workflow

1. **On PR:** Run tests and build
2. **On push to main:** Build Docker images and push to registry
3. **Deploy:** SSH to server and update containers

---

## Performance Tuning

### Redis Configuration

Edit `docker-compose.yml`:
```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Node.js Clustering

Update `server/src/index.ts`:
```typescript
import cluster from 'cluster';
import os from 'os';

if (cluster.isPrimary) {
  for (let i = 0; i < os.cpus().length; i++) {
    cluster.fork();
  }
} else {
  startServer();
}
```

### nginx Worker Processes

Edit `nginx/nginx.conf`:
```nginx
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 4096;
    use epoll;
}
```

---

## Monitoring

### Prometheus + Grafana

```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml

grafana:
  image: grafana/grafana
  ports:
    - "3000:3000"
```

### Health Checks

```bash
# Server health
curl http://localhost:4000/health

# WebSocket
wscat -c ws://localhost:4000/ws?sessionId=test

# Redis
docker-compose exec redis redis-cli INFO stats
```

---

## Troubleshooting

### WebSocket connection fails
- Check nginx WebSocket config
- Verify firewall allows port 4000
- Check CORS origins in server `.env`

### High memory usage
- Limit Redis memory
- Check for telemetry batch upload issues
- Monitor session cleanup

### Database locked
- Ensure only one server instance
- Check WAL mode enabled
- Verify file permissions

---

## Security Checklist

- [ ] HTTPS enabled with valid certificate
- [ ] CORS origins restricted
- [ ] Rate limiting configured
- [ ] Redis password set (production)
- [ ] Database backups automated
- [ ] Firewall rules configured
- [ ] Environment secrets secured
- [ ] Docker images scanned for vulnerabilities
- [ ] Nginx security headers added

---

## Scaling

### Horizontal Scaling

Use Redis for session state:
```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

// Store sessions in Redis instead of memory
```

### Load Balancer

```nginx
upstream wavesync_cluster {
    least_conn;
    server server1:4000;
    server server2:4000;
    server server3:4000;
}
```

### Database Replication

For high load, migrate from SQLite to PostgreSQL:
```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: wavesync
    POSTGRES_USER: wavesync
    POSTGRES_PASSWORD: ${DB_PASSWORD}
```

---

**Next Steps:** Configure your domain, deploy, and monitor! 🚀
