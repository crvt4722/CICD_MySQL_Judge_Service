## Simple Ansible installation with python virtualvenv
- python3 -m venv venv
- source venv/bin/activate
- pip install ansible
- Install docker plugins: ansible-galaxy collection install community.docker

## Using Ansible
- Ping hosts: ansible all -i inventory.yml -m ping
