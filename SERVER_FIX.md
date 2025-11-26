# Server Run করার জন্য Fix

## সমস্যা:
Server run হচ্ছে না বা crash করছে

## সমাধান:

### 1. Environment Variables Check করুন:

Server folder এ `.env` file তৈরি করুন (যদি না থাকে):

```env
PORT=5000
MONGO_URI=your-mongodb-connection-string
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002,https://tech-gear-client.vercel.app
NEXTAUTH_SECRET=your-secret-key-here
```

### 2. Dependencies Install করুন:

```bash
cd server
npm install
```

### 3. Server Run করুন:

```bash
# Development mode (auto-restart)
npm run dev

# Production mode
npm start
```

### 4. Common Issues:

#### Issue 1: MongoDB Connection Error
- **Solution:** `.env` file এ `MONGO_URI` check করুন
- Server এখন MongoDB ছাড়াও run হবে (warning দেখাবে)

#### Issue 2: Port Already in Use
- **Solution:** Port change করুন `.env` file এ:
  ```
  PORT=5001
  ```

#### Issue 3: Module Not Found
- **Solution:** 
  ```bash
  cd server
  npm install
  ```

### 5. Vercel Deployment:

Vercel এ deploy করার জন্য:
1. Vercel Dashboard → Project Settings
2. Environment Variables add করুন:
   - `MONGO_URI`
   - `ALLOWED_ORIGINS`
   - `NEXTAUTH_SECRET`
3. Deploy করুন

### 6. Test Server:

Server run হওয়ার পর test করুন:
```bash
curl http://localhost:5000/
# বা browser এ open করুন: http://localhost:5000/
```

Response: "Tech Gear Server is Running on Vercel!"

