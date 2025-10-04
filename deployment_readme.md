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

Once connected to the instance, run the following commands to update the system, install Git, NVM (Node Version Manager), Node.js, npm, pm2, and Nginx:

```bash
sudo dnf update -y
sudo dnf install -y git

# Install NVM (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash
. ~/.nvm/nvm.sh
nvm install 20 # Install Node.js version 20 (or your desired version)
nvm use 20
nvm alias default 20

# Install pm2 globally
npm install -g pm2

sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Step 3: Clone the Project

Clone the project's Git repository into the user's home directory:

```bash
git clone http://github.com/wepaysam/wepay.git
```

### Step 4: Install Project Dependencies and Build

Navigate into the project directory and install the necessary npm packages and build the application for production:

```bash
cd wepay
npm install
npm run build
```

### Step 5: Run the Application with PM2

### Step 5: Run the Application with PM2

Navigate into your project directory and start the Next.js application using PM2:

```bash
cd wepay
pm2 start npm --name "wepay-app" -- run start
pm2 save
pm2 startup
```

### Step 6: Configure Nginx as a Reverse Proxy

Create a new Nginx server block configuration file to act as a reverse proxy, directing traffic from port 80 to the application running on port 3000.

*Create the configuration file:*

```bash
sudo nano /etc/nginx/conf.d/wepay.conf
```

*Add the following content to the file:*

```nginx
server {
    listen 80;
    server_name your_domain_or_ip_address; # Replace with your domain name or EC2 Public IP

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

*Save the file (Ctrl+O, Enter, Ctrl+X in nano) and then restart Nginx to apply the changes:*

```bash
sudo systemctl restart nginx
```

### Step 7: Handling Environment Variables

Your Next.js application might rely on environment variables (e.g., API keys, database URLs). For PM2 deployments, you can manage these variables in a `.env.local` file in your project root. This file should NOT be committed to Git.

**Example `.env.local` content:**

```
NEXT_PUBLIC_API_URL=https://api.example.com
DATABASE_URL=postgresql://user:password@host:port/database
P2I_API_URL=your_p2i_api_url
P2I_AUTH_TOKEN=your_p2i_auth_token
```

**Note:** Ensure sensitive environment variables are not committed to your Git repository. Use `.gitignore` to exclude environment files.

### Step 8: Updating the Deployment

To update your deployed application, follow these steps:

1.  **On your local machine:**
    ```bash
    git add .
    git commit -m "Your commit message"
    git push origin main # Or your branch name
    ```

2.  **On the EC2 instance:**
    ```bash
    cd wepay # Navigate to your project directory
    git pull origin main # Or your branch name

    # Clean up and reinstall dependencies if package.json changed
    rm -rf .next
    rm -rf node_modules
    rm -f package-lock.json
    npm install

    # Install dotenv if it's a new dependency and not already installed
    # npm install dotenv

    # Update .env.local if any environment variables have changed or been added
    # nano .env.local

    npm run build
    pm2 restart all
    ```


    to know all config file in nginx
    ls -l /etc/nginx/sites-enabled/
 then 
 sudo nano /etc/nginx/sites-enabled/wepayx.co.in

 3000 port for .in and 5001 for .co.in
 

