# Node.js Service Deployment

**Project URL:** https://roadmap.sh/projects/nodejs-service-deployment

Automated deployment of a Node.js service to an Oracle Cloud virtual machine using Ansible and GitHub Actions.

This project demonstrates a CI/CD workflow where changes pushed to GitHub can be automatically deployed to a remote Oracle Cloud server.

## Architecture

```text
Developer
    │
    │ git push
    ▼
GitHub Repository
    │
    │ GitHub Actions
    ▼
Ansible
    │
    │ SSH
    ▼
Oracle Cloud VM
    │
    ├── Ubuntu
    ├── Nginx
    ├── Node.js
    ├── systemd
    ├── Fail2ban
    └── iptables
         │
         ▼
    Node.js Application
```

## Features

* Automated Node.js deployment with Ansible
* CI/CD deployment with GitHub Actions
* Oracle Cloud Infrastructure
* Nginx reverse proxy
* Node.js application managed by systemd
* Persistent iptables configuration
* Fail2ban for SSH protection
* Automatic application restart when the application is updated
* Idempotent Ansible configuration
* SSH-based remote deployment

## Technology Stack

| Technology     | Purpose                             |
| -------------- | ----------------------------------- |
| Node.js        | Backend application                 |
| Express        | HTTP server                         |
| Ansible        | Server configuration and deployment |
| GitHub Actions | CI/CD automation                    |
| Oracle Cloud   | Cloud infrastructure                |
| Ubuntu         | Server operating system             |
| Nginx          | Reverse proxy                       |
| systemd        | Node.js process management          |
| iptables       | Firewall                            |
| Fail2ban       | SSH brute-force protection          |

## Project Structure

```text
nodejs-service-deployment/
├── .github/
│   └── workflows/
│       └── deploy.yml
│
├── ansible/
│   ├── inventory.ini
│   ├── node_service.yml
│   │
│   └── roles/
│       ├── base/
│       │   └── tasks/
│       │       └── main.yml
│       │
│       ├── app/
│       │   ├── tasks/
│       │   │   └── main.yml
│       │   └── handlers/
│       │       └── main.yml
│       │
│       └── nginx/
│           └── tasks/
│               └── main.yml
│
└── app/
    ├── src/
    │   └── index.js
    ├── package.json
    └── package-lock.json
```

## Application

The application is a simple Express service used to demonstrate the deployment process.

Example response:

```text
Hello from CI/CD!
```

The Node.js application runs on the Oracle Cloud VM and is managed by systemd.

## Ansible

The main Ansible playbook is:

```text
ansible/node_service.yml
```

The playbook contains three roles:

```text
node_service.yml
    │
    ├── base
    ├── app
    └── nginx
```

### Base Role

The `base` role prepares the server by:

* Updating the APT package cache
* Installing basic utilities
* Installing `iptables-persistent`
* Installing Fail2ban
* Enabling and starting Fail2ban
* Allowing HTTP traffic on port `80`
* Saving iptables rules for persistence across reboots

### App Role

The `app` role is responsible for deploying the Node.js application.

It:

* Installs Node.js 22 and npm
* Creates the application directory
* Clones the GitHub repository
* Installs application dependencies
* Creates the `nodejs-service` systemd service
* Enables the service at boot
* Restarts the service when the application changes

The application is executed using:

```text
/usr/bin/node src/index.js
```

The application files are deployed to:

```text
/opt/nodejs-service-deployment/app
```

### Nginx Role

Nginx acts as a reverse proxy in front of the Node.js application.

```text
Internet
    │
    │ HTTP :80
    ▼
  Nginx
    │
    │ Proxy
    ▼
Node.js :3000
```

This allows the application to be accessed through standard HTTP port `80`.

## Ansible Inventory

The Oracle Cloud server is defined in `inventory.ini`:

```ini
[servers]
ansible-server ansible_host=YOUR_SERVER_IP ansible_user=ubuntu

# SSH private key is provided externally with --private-key
# ansible_ssh_private_key_file=~/.ssh/oracle-cloud.key
```

The SSH key path can also be configured directly in the inventory when working locally:

```ini
ansible_ssh_private_key_file=~/.ssh/oracle-cloud.key
```

Alternatively, Ansible can receive the key through the command line:

```bash
--private-key ~/.ssh/oracle-cloud.key
```

The private key must never be committed to the repository.

## Manual Deployment

From the `ansible` directory:

```bash
cd ansible
```

### Test Ansible connectivity

```bash
ansible ansible-server \
  -i inventory.ini \
  --private-key ~/.ssh/oracle-cloud.key \
  -m ping
```

Expected result:

```text
ansible-server | SUCCESS => {
    ...
    "ping": "pong"
}
```

### Deploy the application role

The `app` role can be executed independently using the `app` tag:

```bash
ansible-playbook node_service.yml \
  -i inventory.ini \
  --private-key ~/.ssh/oracle-cloud.key \
  --tags app
```

This was used to verify the manual deployment process.

### Deploy the complete server

To run all roles:

```bash
ansible-playbook node_service.yml \
  -i inventory.ini \
  --private-key ~/.ssh/oracle-cloud.key
```

This executes:

```text
base → app → nginx
```

## Systemd

The Node.js application is managed by a systemd service called:

```text
nodejs-service
```

Check its status with:

```bash
sudo systemctl status nodejs-service
```

Or:

```bash
sudo systemctl is-active nodejs-service
```

The service is configured to:

* Start automatically after boot
* Restart automatically if the process exits
* Run as the `ubuntu` user
* Use the production environment

## Nginx

Check Nginx:

```bash
sudo systemctl status nginx
```

The service is enabled so it starts automatically after a server reboot.

## Firewall

The server uses iptables to control inbound traffic.

The configuration allows:

* Established connections
* ICMP
* SSH on port `22`
* HTTP on port `80`

The rules are persisted using `iptables-persistent`.

Verify the rules with:

```bash
sudo iptables -L INPUT -n -v --line-numbers
```

## CI/CD with GitHub Actions

GitHub Actions automates the deployment process.

The workflow:

1. Runs when changes are pushed to GitHub
2. Installs/configures Ansible
3. Configures SSH authentication
4. Loads the Oracle Cloud private key from GitHub Secrets
5. Runs the Ansible playbook
6. Updates the application on the Oracle Cloud VM

```text
git push
    │
    ▼
GitHub Actions
    │
    ├── Configure SSH
    ├── Install Ansible
    └── Run node_service.yml
            │
            ▼
       Oracle Cloud VM
            │
            ├── Update repository
            ├── Install dependencies
            └── Restart application
```

## GitHub Actions Secret

The Oracle Cloud SSH private key is stored as a GitHub repository secret.

Secret name:

```text
ORACLE_SSH_PRIVATE_KEY
```

The secret contains the complete private key, including:

```text
-----BEGIN RSA PRIVATE KEY-----
...
-----END RSA PRIVATE KEY-----
```

The private key is never stored in the repository.

## Automatic Deployment

The application role uses an Ansible handler to restart the Node.js service when the application repository changes.

Example:

```yaml
notify: Restart Node.js application
```

The handler:

```yaml
- name: Restart Node.js application
  ansible.builtin.systemd:
    name: nodejs-service
    state: restarted
```

This allows a code change to be deployed without manually restarting the application.

## Verification

After deployment, verify the Node.js service:

```bash
ansible ansible-server \
  -i inventory.ini \
  --private-key ~/.ssh/oracle-cloud.key \
  -b -m shell \
  -a "systemctl is-active nodejs-service"
```

Expected:

```text
active
```

Verify Nginx:

```bash
ansible ansible-server \
  -i inventory.ini \
  --private-key ~/.ssh/oracle-cloud.key \
  -b -m shell \
  -a "systemctl is-active nginx"
```

Expected:

```text
active
```

Finally, test the application from the local machine:

```bash
curl http://YOUR_SERVER_IP
```

Expected response:

```text
Hello, world!
```

## CI/CD Verification

The CI/CD pipeline can be verified by changing the application response.

For example:

```js
res.status(200).send("Hello from CI/CD 2!");
```

After committing and pushing the change:

```bash
git add .
git commit -m "feat: update application response"
git push
```

GitHub Actions runs the Ansible deployment automatically.

Once the workflow succeeds:

```bash
curl http://YOUR_SERVER_IP
```

should return the updated response without manually running Ansible.

## Deployment Flow

The complete workflow is:

```text
Developer
    │
    │ git push
    ▼
GitHub
    │
    ▼
GitHub Actions
    │
    │ SSH + Ansible
    ▼
Oracle Cloud VM
    │
    ├── Base configuration
    │
    ├── Application deployment
    │
    └── Nginx configuration
            │
            ▼
       Node.js Service
            │
            ▼
        HTTP :80
```

## Security

The deployment uses several security measures:

* SSH key-based authentication
* GitHub Secrets for CI/CD credentials
* No private SSH keys committed to Git
* Oracle Cloud network security rules
* iptables firewall rules
* Fail2ban for SSH protection
* Node.js application running as the `ubuntu` user instead of root
* Nginx exposed on port `80` while Node.js remains behind the reverse proxy

## Author

**Tommy Grullón Contreras**

Software Engineering Student & Web Developer
