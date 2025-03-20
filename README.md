# Running

### Dependencies for running
- Node v. 18.8.x
- Docker

### How to run
1. Open bash terminal in project folder
2. Copy .env.example to .env
3. Change BAKCEND_WALLET_KEY value in .env
4. Run npm install
5. Start Docker
6. Run ./von-network/manage build
7. Run ./von-network/manage up
8. Run node index.js

### First time setup
When the backend is first started, some extra configurations steps are necessary.\
The backend server will prompt the user to execute some steps\
in relation to the local ledger that is run in step 5.\
A web interface for the ledger can be found [here](http://localhost:9000)
when the ledger is running.

A TRUSTEE transaction can be found in the 

>Ledger State > Domain 

part of the web interface.

Adding a DID to the ledger can be done under the

>Authenticate a New DID > Register from DID

part of the web interface.