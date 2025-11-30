
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {cors:{origin:"*"}});
const cors = require('cors');
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

let quizzes = {}; // quizId -> {teams:{teamName:{members:[], answered:false}}, answers:[]}

function makeId() {
  return Math.random().toString(36).substring(2,8).toUpperCase();
}

app.post('/createQuiz', (req,res)=>{
  const {quizName, teams} = req.body;
  const quizId = makeId();
  quizzes[quizId] = {quizName, teams:{}, answers:[]};
  teams.forEach(t=>{
    quizzes[quizId].teams[t] = {members:[], answered:false};
  });
  res.json({quizId});
});

app.post('/joinTeam',(req,res)=>{
  const {quizId, team, name} = req.body;
  if(!quizzes[quizId]) return res.status(400).json({error:"No quiz"});
  quizzes[quizId].teams[team].members.push(name);
  res.json({ok:true});
});

io.on('connection', socket=>{
  socket.on('joinRoom', ({quizId, team, name})=>{
    socket.join(quizId+"_"+team);
  });

  socket.on('submitAnswer', ({quizId, team, name, answer})=>{
    const q=quizzes[quizId];
    if(!q || q.teams[team].answered) return;
    q.teams[team].answered = true;
    const entry = {team, name, answer, time:Date.now()};
    q.answers.push(entry);
    io.to("admin_"+quizId).emit("newAnswer", entry);
  });

  socket.on('adminJoin', (quizId)=>{
    socket.join("admin_"+quizId);
  });

  socket.on('resetQuestion', (quizId)=>{
    const q = quizzes[quizId];
    if(!q) return;
    Object.values(q.teams).forEach(t=> t.answered=false);
    q.answers=[];
    io.to("admin_"+quizId).emit("resetDone",{});
  });
});

http.listen(3000, ()=> console.log("Server running"));
