# Running

### Dependencies for running
- Node v. 18.18.x
- Docker Engine v. 28.x

### How to run
1. Open bash terminal in project folder
2. Copy .env.example to .env
3. Change BAKCEND_WALLET_KEY value in .env
4. Run npm install
5. Start Docker
6. On Windows, activate the "Add the *.docker.internal names to host's /etc/hosts file" under General settings
7. Run git submodule update --init
8. Run ./von-network/manage build
9. Run ./von-network/manage up
10. Run node src/index.js

### First time setup
When the backend is first started, some extra configurations steps are necessary.\
The backend server will prompt the user to execute some steps\
in relation to the local ledger that is run in step 5.\
A web interface for the ledger can be found [here](http://localhost:9000)
when the ledger is running.\

### How to run after first time setup
Execute steps 5, 9 and 10.