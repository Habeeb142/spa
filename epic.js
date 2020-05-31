// data encryption::::::::::::::::::::::::::::::::::::::::::::::::::
const bcrypt = require('bcrypt')
var salt = 10 //any random value

//making express available::::::::::::::::::::::::::::::::::::::::::::::::
var express = require('express');
const epic = express();

//connecting to locahost::::::::::::::::::::::::::::::::::::::::::::::::::
myPort = epic.listen(port = 3000 || env.process.PORT, ()=>{
    console.log("EPIC is listening to port "+port+" sir!");
});

// cookie::::::::::::::::::::::::::::::::::::::::::::::::::
var cookie = require('cookie-parser')
epic.use(cookie())

//setting engine to ejs::::::::::::::::::::::::::::::::::::::::::::::::::
epic.set('view engine', 'ejs');

//middlewares:::::::::::::::::::::::::::::::::::::::::::::::::::::
epic.use(express.static(__dirname+'/public'));

//requiring formidable and fs::::::::::::::::::::::::::::::::::::::::::::
var fm = require('formidable');
var fs = require('fs');

//requiring body-parser::::::::::::::::::::::::::::::::::::::::::::::::::::
var bodyParser = require('body-parser');
epic.use(bodyParser.json());
epic.use(bodyParser.urlencoded({extended:true}));


//requiring mysql::::::::::::::::::::::::::::::::::::::::::::::::::::::
var mysql = require('mysql');

//seting connection:::::::::::::::::::::::::::::::::::::::::
let connection = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "root",
    database: "spa_db"
});

//index - onload::::::::::::::::::::::::;:::::::::::::::::::::::::::::::::
epic.get('/', (req, res)=>{
    res.render('index', { status: null, id: null, firstname: null, lastname: null });
});

//routing into signup page::::::::::::::::::::::::::::::::::::::::::::::::
epic.get('/signup.epic', (req,res)=>{
    res.render('signup', {status: null, firstname: null, lastname: null, mobile: null, id: null});
});

//submitting sign-up data:::::::::::::::::::::::::::::::::::::::::::::::::
epic.post('/signup', (req, res)=>{
    //creating a method from formidable class::::::::::::::::::::::::::::::
    var form = new fm.IncomingForm();
    
    //submitting files and fields to database:::::::::::::::::::::::
    form.parse(req, (err, fields, files)=>{
        if(fields.firstname !="" && fields.lastname !=""  && fields.mobile !="" && fields.cpassword !="" && fields.password != ""){
            //checking passowrd and confirm passowrd are equal::::::::::::::::::::
            if(fields.cpassword == fields.password){
                
                let tmp = files.file.path;
                let pix = files.file.name;
                let img = pix;
                let imgLink = "public/userImages/"+pix;

                let newUserInfo = {
                    firstname: fields.firstname,
                    lastname: fields.lastname,
                    mobile: fields.mobile,
                    password: fields.password,
                    file: img
                }

               
                // checking if mobile data already exist::::::::::::::::::::::::::::::::::::::::::::::::::::
                sql_select_mobile = `SELECT mobile FROM profile_tb where mobile = '${newUserInfo.mobile}'`;
                connection.query(sql_select_mobile, (err, data)=>{
                    // if user already exist
                    if(data.length) {
                        res.render('signup', { status: 'user_already_exist', firstname: newUserInfo.firstname, mobile: null, lastname: fields.lastname })
                    }
                    // if user doesnt exist
                    else {
                        // encrypting password
                        bcrypt.hash(newUserInfo.password, salt, (err, encrypted) => {
                            newUserInfo.password = encrypted 

                            //putting into database and sending from temporary location to permanent location::::::::::::::::::::::::::::::::::::
                            fs.rename(tmp, imgLink, ()=>{
                                sql_insert = `INSERT into profile_tb (firstname, lastname, mobile, password, file) values('${newUserInfo.firstname}', '${newUserInfo.lastname}', '${newUserInfo.mobile}','${newUserInfo.password}','${newUserInfo.file}')`;
                                connection.query(sql_insert, (err,data)=>{
                                    if(err) {
                                        throw err;
                                    }
                                    else{
                                        sql_select_id = `SELECT id FROM profile_tb where mobile = '${newUserInfo.mobile}' AND password = '${newUserInfo.password}'`;
                                        connection.query(sql_select_id, (err, data)=>{
                                            // console.log(data[0].id)
                                            res.render('index', { status: 'signedIn', id: data[0].id, mobile: null});
                                        })
                                    }
                                });
                            
                            });
                        })
                    }
                }) 
            }
        else{
            res.render('signup', { status: 'password_err', firstname: fields.firstname, mobile: fields.mobile, lastname: fields.lastname })
        }
    }
    else{
        res.render('signup', { status: 'fillform_err', firstname: fields.firstname, mobile: fields.mobile, lastname: fields.lastname })
    }     
})
})

//rendering into dashborad if requirement is being met or reload login if otherwise
epic.post('/login', (req, res)=>{

    request_password =  req.body.password;
    request_id = req.body.id;

    if(request_id!="" && request_password!="") {
        sql_syntax_pwd = `SELECT password FROM profile_tb where id = '${req.body.id}'`;
        connection.query(sql_syntax_pwd, (err, data)=>{ 
            faker_pwd = data[0].password
            // console.log(faker_pwd)
    
            // comparing sent passworrd with saved password
            bcrypt.compare(request_password, faker_pwd, function (err, result) {
                if (result == true) {
                    
                    sql_syntax = `SELECT * FROM profile_tb where id = '${req.body.id}' AND password = '${faker_pwd}'`;
                    connection.query(sql_syntax, (err, data)=>{
                        if(data.length!=0){
                            // set auth
                                //generating token
                                token = Math.random().toString(36).substring(2) + Math.random()*100000000000000000;
                                // console.log(token)
                                // setting into cookies
                                res.cookie('token', req.body.id+token);
                            
                                res.redirect(`/dashboard/${req.body.id}`);
                        }
                        else {
                            res.render('index', { status: 'password_err', id: req.body.id, mobile: null});
                        }
                    })
                } 
                else {
                    res.render('index', { status: 'password_err', id: req.body.id, mobile: null});
                    // redirect to login page
                }
            })
        })
    }
    else {
        res.render('index', { status: 'password_err', id: req.body.id, mobile: null});
    }
});

//rendering into dashborad if requirement is being met or reload login if otherwise
epic.get('/dashboard/:data', (req, res)=>{

    // checking auth
    token = req.cookies['token']
    // console.log(token)
    // id from cookie
    if(token!==undefined){

        faker_id = token.slice(0,2);
        // id from url
        non_faker_id = req.params.data;

        // checking equalityies btw d id.s
        if(faker_id == non_faker_id) {
            sql_syntax = `SELECT * FROM profile_tb where id = '${req.params.data}'`;
                connection.query(sql_syntax, (err, data)=>{
                // console.log(data[0])
                res.render('dashboard', { status: 'loggedIn', data: data[0]});
            })
        }
        else {
            res.redirect('/')
        }
    }

    else {
        res.redirect('/')
    }
})  

//rendering into profile edit::::::::::::::::::::::::::::::::::::::::::::::::::::
epic.post('/detail_info', (req, res)=>{
    firstname = req.body.firstname
    lastname = req.body.lastname
    mobile = req.body.mobile
    id = req.body.id

    sql_update_syntax = `UPDATE profile_tb SET firstname = '${firstname}', lastname = '${lastname}', mobile = '${mobile}' WHERE id='${id}'`;
    connection.query(sql_update_syntax, (err, data)=>{
        console.log(err)

        // select data updated
        sql_syntax = `SELECT * FROM profile_tb where id = '${id}' `;
        connection.query(sql_syntax, (err, data)=>{
        // console.log(data[0])
        res.redirect(`/dashboard/${id}`);
        // res.render('dashboard', { status: 'updated', data: data[0]});
    })
        
    })
});

// logout::::::::::::::::::::::::::::::::::::::::::::::::::::
epic.get('/logout', (req, res)=>{
    // cookie clear and redirect
    res.clearCookie('token')
    res.redirect('/')
});
