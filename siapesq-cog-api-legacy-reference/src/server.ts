import 'dotenv/config';
import App from './app';
const port = process.env.PORT || 3001;
const app=new App()
if (!app.orm){
    throw new Error("ORM not initialized")
}
app.orm.init(false)
app.server.listen(port)

