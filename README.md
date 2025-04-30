# Running

### Dependencies for running locally
- Node.js v. 18.18.x
- Docker Engine v. 28.x
- Docker Compose

### How to run locally
1. Start Docker
2. On Windows, activate the "Add the *.docker.internal names to host's /etc/hosts file" under General settings in Docker Desktop
3. Clone this repository: https://github.com/smart-on-fhir/smart-dev-sandbox.git
4. Open a bash terminal in the repository's folder
5. Run "docker compose up -d"
6. Go to this project's folder
7. Copy the .env.example file to a .env file
8. Change BACKEND_WALLET_KEY value in .env
9. Change the BACKEND_IP value in .env
10. Change the SESSION_SECRET value in .env
11. Open the web interface of the FHIR server [here](http://localhost:4000/)
12. Click "Launch a SMART App" under the "FHIR R4 Server" section
13. Choose "Provider Standalone Launch" under "Launch Type"
14. Write 1 under "Patient(s)" and write 3 under "Provider(s)"
15. Copy the URL under "FHIR Server Url" and paste it in as the SMART_URL value in .env
16. Open a bash terminal in this project's folder
17. Run "npm install"
18. Run "git submodule update --init"
19. Run "./von-network/manage build"
20. Run "./von-network/manage up"
21. Run "npm run dev"

### First time setup
When the backend is first started, some extra configuration steps are necessary.\
The backend server will prompt the user to execute some steps\
in relation to the local ledger that is run in step 18.\
A web interface for the ledger can be found [here](http://localhost:9000)
when the ledger is running.

### How to run after first time setup
Execute steps 4, 5, 9, 16, 17, 20 and 21.