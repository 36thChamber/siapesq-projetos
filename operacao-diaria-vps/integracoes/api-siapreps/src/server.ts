import 'dotenv/config';
import App from './app';

async function bootstrap() {
    const port = process.env.PORT || 3001;
    const app = new App()
    if (!app.orm){
        throw new Error("ORM not initialized")
    }

    await app.orm.init()
    app.server.listen(port, () => {
        console.log(`Server running on port ${port}`)
    })
}

bootstrap()
