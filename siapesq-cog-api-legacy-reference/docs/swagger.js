const swaggerAutogen = require('swagger-autogen')({openapi: '3.0.0'})
const doc = {
    info: {
      version: '1.0',   
      title: 'SIAPESQ-API',
      description: 'REST API da SIAPESQ'         
    },
    servers:[
        {url:'http://localhost:3001',description:"LocalServer"},
    ],
    //basePath: '/',            
    //schemes: ['http','https'],             
    consumes: ['application/json','multipart/form-data'],
    produces: ['application/json'],
    tags: [
        
    ],
    securityDefinitions: {
        token: {
            type: 'apiKey',
            in: 'header',
            name: 'Authorization',
            description: 'Token De Acesso'
        },
        apiKey: {
            type: 'apiKey',
            in: 'header',
            name: 'x-api-key',
            description: 'Api Key'
        },
    },  
    definitions: {}
  };
const outputFile = './docs/swagger.json'
const endpointsFiles = ['./src/routes/v1/router.ts']
swaggerAutogen(outputFile,endpointsFiles,doc)