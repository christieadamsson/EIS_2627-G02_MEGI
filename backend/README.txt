This is how the backend should be divided. 

backend/
  controllers/    receives the request from the browser ("someone clicked login")
  services/       the rules ("is this password correct? is the account approved?")
  repositories/   talks to the database (the only place with SQL)
  config/         database password settings



  rest of readme under frontend > README.md