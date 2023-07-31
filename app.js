import express from 'express';
import index from './routes/index.js';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import "dotenv/config";
import os from 'os';

const port = process.env.port || 3000
const app = express()

const authenticate = (req, res, next) => {
  // 从请求头中获取认证信息
  const authHeader = req.headers.authorization;
  // 进行认证逻辑，例如检查认证信息是否有效
  // ...

  // 如果认证通过，调用 next() 继续处理请求
  next();
};
app.use(express.json());
app.use(express.raw());
app.use(express.text());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(session({
  secret: 'midjourney',
  name: 'midjourney-api',
  cookie: {maxAge: 60000},
  resave: false,
  saveUninitialized: true,
}));

app.use(authenticate);
app.use('/', index);

const networkInterfaces = os.networkInterfaces();
const addresses = [];
for (const interfaceName in networkInterfaces) {
  const interfaces = networkInterfaces[interfaceName];
  for (const iface of interfaces) {
    // 只获取IPv4地址
    if (iface.family === 'IPv4' && !iface.internal) {
      addresses.push(iface.address);
    }
  }
}

app.listen(port, () => {
  console.log(`Localhost：http://localhost:${port}\nNetwork：http://${addresses[0]}:${port}`);
});

export default app;
