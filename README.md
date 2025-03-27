# Running

### Dependencies for running locally
- Node v. 18.18.x
- Docker Engine v. 28.x
- Docker Compose

### How to run locally
1. Start Docker
2. Clone this repository: https://github.com/smart-on-fhir/smart-dev-sandbox.git
3. Open a bash terminal in the repository's folder
4. Run "docker compose up -d"
5. Go to this project's folder
6. Copy the .env.example file to a .env file
7. Change BACKEND_WALLET_KEY value in .env
8. Change the BACKEND_IP value in .env
9. Open the web interface of the FHIR server [here](http://localhost:4000/)
10. Click "Launch a SMART App" under the "FHIR R4 Server" section
11. Choose "Provider Standalone Launch" under "Launch Type"
12. Write 1 under "Patient(s)" and write 3 under "Provider(s)"
13. Copy the URL under "FHIR Server Url" and paste it in as the SMART_URL value in .env
14. Open bash terminal in this project's folder
15. Run "npm install"
16. On Windows, activate the "Add the *.docker.internal names to host's /etc/hosts file" under General settings in Docker Desktop
17. Run "git submodule update --init"
18. Run "./von-network/manage build"
19. Run "./von-network/manage up"
20. Run "node src/index.js"

### First time setup
When the backend is first started, some extra configurations steps are necessary.\
The backend server will prompt the user to execute some steps\
in relation to the local ledger that is run in step 18.\
A web interface for the ledger can be found [here](http://localhost:9000)
when the ledger is running.

### How to run after first time setup
Execute steps 8, 15, 19 and 20.