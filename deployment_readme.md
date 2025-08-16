# Next.js Application Deployment on AWS EC2

This document provides a step-by-step guide to deploying the WePay Next.js application to an AWS EC2 instance.

## Prerequisites

Before you begin, you will need the following information:

*   **EC2 Public IP Address:** The public IP address of your EC2 instance.
*   **SSH Key:** The path to your SSH private key file (`.pem`).
*   **EC2 Username:** The username for your EC2 instance (e.g., `ec2-user`, `ubuntu`).
*   **Git Repository URL:** The URL of the Git repository for the project.

## Deployment Steps

### Step 1: Connect to the EC2 Instance

Use the following command to connect to your EC2 instance via SSH:

```bash
ssh -i "/path/to/your-key.pem" <username>@<public-ip-address>
```

### Step 2: Install Dependencies

Once connected to the instance, run the following commands to update the system, install Git, NVM (Node Version Manager), Node.js, and Nginx:

```bash
sudo dnf update -y
sudo dnf install -y git
sudo dnf install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -a -G docker ec2-user # Add ec2-user to docker group
# You will need to log out and log back in for the group change to take effect.

sudo dnf install -y nginx
```

### Step 3: Clone the Project

Clone the project's Git repository into the user's home directory:

```bash
git clone http://github.com/wepaysam/wepay.git
```

### Step 4: Create Dockerfile and Build Image

Create a `Dockerfile` in the root of your project directory. This file defines how your application will be built into a Docker image.

*Create the Dockerfile:*

```bash
nano Dockerfile
```

*Add the following content to the Dockerfile:*

```dockerfile
# Use a Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port Next.js runs on
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]
```

*Save the file (Ctrl+O, Enter, Ctrl+X in nano) and then build the Docker image:*

```bash
docker build -t wepay-app .
```

### Step 5: Install Project Dependencies and Build

Navigate into the project directory and install the necessary npm packages and build the application for production:

```bash
cd wepay
npm install
npm run build
```

### Step 6: Run the Application with Docker

Run the Docker container, mapping port 3000 from the container to port 3000 on the host:

```bash
docker run -d -p 3000:3000 --name wepay-app wepay-app
```

### Step 7: Configure Nginx as a Reverse Proxy

Create a new Nginx server block configuration file to act as a reverse proxy, directing traffic from port 80 to the application running on port 3000.

*Create the configuration file:*

```bash
sudo nano /etc/nginx/conf.d/wepay.conf
```

*Add the following content to the file:*

```nginx
server {
    listen 80;
    server_name 98.86.197.57;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

```

*Restart Nginx to apply the changes:*

```bash
[ec2-user@ip-172-31-28-171 ~]$ sudo cat /etc/nginx/nginx.conf
# For more information on configuration, see:
#   * Official English Documentation: http://nginx.org/en/docs/
#   * Official Russian Documentation: http://nginx.org/ru/docs/

user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log notice;
pid /run/nginx.pid;

# Load dynamic modules. See /usr/share/doc/nginx/README.dynamic.
include /usr/share/nginx/modules/*.conf;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    keepalive_timeout   65;
    types_hash_max_size 4096;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Load modular configuration files from the /etc/nginx/conf.d directory.
    # See http://nginx.org/en/docs/ngx_core_module.html#include
    # for more information.
    include /etc/nginx/conf.d/*.conf;

    server {
        listen       80;
        listen       [::]:80;
        server_name  _;
        root         /usr/share/nginx/html;

        # Load configuration files for the default server block.
        include /etc/nginx/default.d/*.conf;

        error_page 404 /404.html;
        location = /404.html {
        }

        error_page 500 502 503 504 /50x.html;
        location = /50x.html {
        }
    }

# Settings for a TLS enabled server.
#
#    server {
#        listen       443 ssl;
#        listen       [::]:443 ssl;
#        http2        on;
#        server_name  _;
#        root         /usr/share/nginx/html;
#
#        ssl_certificate "/etc/pki/nginx/server.crt";
#        ssl_certificate_key "/etc/pki/nginx/private/server.key";
#        ssl_session_cache shared:SSL:1m;
#        ssl_session_timeout  10m;
#        ssl_ciphers PROFILE=SYSTEM;
#        ssl_prefer_server_ciphers on;
#
#        # Load configuration files for the default server block.
#        include /etc/nginx/default.d/*.conf;
#
#        error_page 404 /404.html;
#        location = /404.html {
#        }
#
#        error_page 500 502 503 504 /50x.html;
#        location = /50x.html {
#        }
#    }
}
[ec2-user@ip-172-31-28-171 ~]$ 
[ec2-user@ip-172-31-28-171 ~]$ ls -l /etc/nginx/conf.d/
total 4
-rw-r--r--. 1 root root 328 Aug 13 08:26 wepay.conf