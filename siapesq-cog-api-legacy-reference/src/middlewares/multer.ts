import Path from 'path';
import Multer from 'multer';
export const upload=Multer({dest:`${Path.resolve()}/temp`})
