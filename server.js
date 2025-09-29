const express= require("express");
const session= require("express-session");
const mongoose= require("mongoose");
const path= require("path");
const MongoStore= require("connect-mongo");
const bcrypt= require("bcrypt");
const { timeStamp } = require("console");
const PORT = process.env.PORT || 5000;
require("dotenv").config();
const app= express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(express.static(path.join(__dirname,"/public")));
// MongoDb connection-------
// mongodb+srv://task-manager:1981pkg@005@cluster0.tvll6fv.mongodb.net/
// mongodb+srv://task-manager:1981pkg@005@cluster0.tvll6fv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
// mongodb://127.0.0.1:27017/taskManagerDB

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log("✅ MongoDB Atlas Connected"))
.catch(err => console.error("❌ MongoDB connection error:", err));
// Routes----

app.get("/", (req, res)=>{
    res.sendFile(path.join(__dirname, "/public/index.html"));
});
// ---session Middleware with MongoStore

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:false,
    store:MongoStore.create({mongoUrl:process.env.MONGO_URI}),
    cookie:{maxAge:1000*60*60*24,
        httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "lax" : "strict",
    maxAge: 1000 * 60 * 60 * 24 // 1 day
    }
}));

// schema & Model

// UserSchema models/User.js

const userSchema= new mongoose.Schema({
    username:{type:String, required:true, unique:true},
    password:{type:String, required:true},
});
const User= mongoose.model("User", userSchema);

// taskSchema models/Task.js
const taskSchema= new mongoose.Schema({
    title:{type:String, required:true},
    completed:{type:Boolean, default:false},
    user:{type:mongoose.Schema.Types.ObjectId, ref:"User"},
});
const Task= mongoose.model("Task", taskSchema);

const authMiddleware=(req, res, next)=>
    {
        if(req.session.userId){
            next();
           
        }
       else{
         res.status(401).json({msg:"Unauthorized user Please log in"})
       }

}


// Register
app.post("/api/v1/auth/register", async(req, res)=>{
    try{
        const {username, password}= req.body;
        console.log(username, password);
        const existingUser= await User.findOne({username});
        if(existingUser)
            return res.status(400).json({msg:"User  alredy exists"});
        const user= await User.create({username, password});
        req.session.userId= user._id;
        res.json({msg:"Registered successfully", user});


    }catch(err){
        res.status(500).json({msg:err.message});

    }
});
// Login

app.post("/api/v1/auth/login", async(req, res)=>{
    try{
        const {username, password}= req.body;
        const user= await User.findOne({username});
        if(!user)
            return res.status(400).json({msg:"Invalid Username"});
        if(password===user.password)
        {
            isMatch=true;
        }
        // const isMatch= await bcrypt.compare(password, user.password);
        if(!isMatch)
            return res.status(400).json({msg:"Invalid Password"});
        req.session.userId=  user._id;
        res.json({msg:"Login successfull"});
        
        

    }catch(err){
        res.status(500).json({msg:err.message});

    }
});

// Logout

app.post("/api/v1/auth/logout", (req, res)=>{
    req.session.destroy(err=>{
        if(err){
            return res.status(500).json({msg:"Logout failed"});
        }
        res.clearCookie("connect.sid")
        res.json({msg:"Logged out successfully"})
    })
});

//create task

app.post("/api/v1/tasks",authMiddleware, async(req, res)=>{
    try{
        const task= new Task({...req.body, user:req.session.userId});
        await task.save();
        res.json(task);
        // console.log(task);

    }catch(err){
        res.status(500).json({msg:err.message});

    }
});
// Get all tasks of logged-in user
app.get("/api/v1/tasks",authMiddleware, async(req, res)=>{
    try{
        const tasks= await Task.find({user:req.session.userId});
    res.json(tasks);
    }
    catch(err){
        res.status(500).json({msg:err.message});
    }
    

});
//update task

app.put("/api/v1/tasks/:id",authMiddleware, async(req, res)=>{
    try{
        // console.log(req.params.id);
        const task= await Task.findOneAndUpdate({_id:req.params.id, user:req.session.userId}, req.body, {new:true});
        if(!task){
            return res.status(404).json({msg:"Task not found"});
         
        }
           res.json(task);

    }catch(err){
        res.status(500).json({msg:err.message});

    }
});
// delete task

app.delete("/api/v1/tasks/:id",authMiddleware, async(req, res)=>{
    try{
        const task= await Task.findOneAndDelete({
            _id:req.params.id, user:req.session.userId
        });
        if(!task){
            return res.status(404).json({msg:"Task not found"});
        }
        res.json({msg:"Task deleted"});
    }catch(err){

    }
})




app.listen(PORT, ()=>console.log(`server running on port${PORT}`));