const express = require('express')

const app = express()

const bcrypt = require('bcrypt')
const session = require('express-session')
const flash = require('express-flash')

app.set ('view engine', 'hbs') 

const db = require('./connection/db')
const upload = require('./middlewares/fileUpload')

const { Store } = require('express-session')
app.use('/public', express.static(__dirname + '/public'))
app.use('/uploads', express.static(__dirname + '/uploads'))

app.use(express.urlencoded({extended: false}))

app.use(
    session({
        cookie: {
            maxAge: 2 * 60 * 60 * 1000, // 2 jam
            secure: false, // 
            httpOnly : true
        },
        store: new session.MemoryStore(),
        saveUninitialized: true,
        resave: false,
        secret: 'secretValue'
    })
)

app.use(flash())

function getFullTime(time) {
    let month = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
    'october', 'november', 'December']

    let date = time.getDate() 
    let monthIndex = time.getMonth()
    let year = time.getFullYear()
    let hours = time.getHours()
    let minutes = time.getMinutes() 
  
    let fullTime = `${date} ${month[monthIndex]} ${year} ${hours}:${minutes} WIB`
  
    return fullTime
}

function getDistanceTime(time) {

    let timePost = time
    let timeNow = new Date()
    let distance = timeNow - timePost
  
    let milisecond = 1000
    let secondInHours = 3600
    let hoursInDay = 23 
    let second = 60
    let minutes = 60 
  
  
    let distanceDay = Math.floor(distance / (milisecond *secondInHours *hoursInDay))
    let distanceHours = Math.floor(distance / (milisecond *second *minutes))
    let distanceMinutes = Math.floor(distance / (milisecond * second))
    let distanceSecond = Math.floor(distance / milisecond)
  
    if(distanceDay >= 1){
      return (`${distanceDay} day ago`);
    } else if (distanceHours >= 1){
      return(`${distanceHours} hours ago`);
    } else if (distanceMinutes >= 1) {
      return(`${distanceMinutes} minutes ago`);
    } else {
      return(`${distanceSecond} second ago`);
    }
}

app.get ('/login', function(req, res) {
    res.render('login')
})

app.post ('/login', function(req, res) {
    
    const {inputEmail, inputPassword} = req.body

    // console.log(req.session);
    
    let query = `SELECT * FROM tb_user WHERE email = '${inputEmail}'`

    db.connect(function(err, client, done) {

        if (err) throw err

        client.query(query, (err, result) => {

            if (err) throw err

            if (result.rows.length == 0){
                req.flash('danger', 'Email not yet registered, please register first !')
                
                return res.redirect('/login')
            }

            const isMatch = bcrypt.compareSync(inputPassword, result.rows[0].password)

            if(isMatch){
                req.session.isLogin = true
                req.session.user = {
                    id: result.rows[0].id,
                    name: result.rows[0].name,
                    email: result.rows[0].email
                }

                req.flash('success', 'Login success !')
                res.redirect('/blog1')
                
            } else {
                req.flash('danger', 'Password is not defined !')
                res.redirect('/login')
            }

            // console.log(isMatch);
            
        })
    })



})

app.get('/logout', function(req, res) {
    req.session.destroy()
    
    res.redirect('/login')
})

app.get('/register', function(req, res){
    res.render('register')
})

app.post('/register', function(req, res){

    const {inputName, inputEmail, inputPassword} = req.body

    const hashedPassword = bcrypt.hashSync(inputPassword, 10)

    let query = `INSERT INTO tb_user (name, email, password) VALUES ('${inputName}','${inputEmail}','${hashedPassword}')`

    db.connect(function(err, client, done) {

        if (err) throw err

        client.query(query, (err, result) => {

            if (err) throw err

            res.redirect('/login')
        });
    })

})

app.get('/', function(req, res){

    db.connect(function(err, client, done) {
        if (err) throw err

        let query = `SELECT * FROM tb_exp`
        client.query(query, (err, result) => {

            if (err) throw err
            let td = result.rows
            res.render('home', {data: td, user: req.session.user, isLogin: req.session.isLogin})
        });
    })
})

app.get('/add-blog', function(req, res){

    if(!req.session.isLogin){
        req.flash('danger', 'Please Login !')
        return res.redirect('/login')
    }

    res.render('add-blog', {user: req.session.user, isLogin: req.session.isLogin})
})

app.get('/contact', function(req, res){
    res.render('contact', {user: req.session.user, isLogin: req.session.isLogin})
})

app.get('/blog1', function (req, res) {

    // console.log(req.session);
    
    const query = `SELECT tb_blog.id, title, tb_blog.content, tb_blog.image, tb_blog.post_at, tb_user.name AS author, tb_blog.author_id
    FROM tb_blog LEFT JOIN tb_user ON tb_blog.author_id = tb_user.id`

    db.connect(function(err, client, done) {

        if (err) throw err

        client.query(query, function(err, result) {
            if (err) throw err

            // let dataView = result.rows

            let newData = result.rows.map( function(data) {
                return {
                    ...data,
                    isLogin : req.session.isLogin,
                    postAt: getFullTime(data.post_at),
                    distance: getDistanceTime(data.post_at)
                }
            })

            res.render("blog1", {isLogin : req.session.isLogin, user: req.session.user, blogs: newData})
        })
    })
})

app.post('/blog1', upload.single('inputImage'), function(req, res){

    let data = req.body

    let image = req.file.filename

    let authorId = req.session.user.id
    
    let query = `INSERT INTO tb_blog (title, content, image, author_id) VALUES ('${data.inputTitle}','${data.inputContent}','${image}','${authorId}')`

    db.connect(function(err, client, done) {

        if (err) throw err

        client.query(query, (err, result) => {

            if (err) throw err

            res.redirect('/blog1')
        });
    })
})

app.get('/delete-blog/:id', function(req, res) {

    if(!req.session.isLogin){
        req.flash('danger', 'Login dulu dong maniezzz !!')
        return res.redirect('/login')
    }
    
    let id = req.params.id

    let query = `DELETE FROM tb_blog WHERE id = ${id}`

    db.connect(function(err, client, done) {

        if (err) throw err

        client.query(query, (err, result) => {

            if (err) throw err

            res.redirect('/blog1')
        });
    })    
})

app.get('/edit-post/:id', function(req, res) {

    let id = req.params.id

    let query = `SELECT * FROM tb_blog WHERE id = ${id}`

    db.connect(function(err, client, done){
        if (err) throw err

        client.query(query, function(err, result){
            if (err) throw err

            let dataView = result.rows[0]
            // console.log(dataView);
            res.render('edit-post', {blog: dataView, id: id})
        })

    })
})

app.post ('/edit-post/:id', upload.single('inputImage'), function(req, res) {

    let id = req.params.id

    let data = req.body
    let image = req.file.filename

    let query = `UPDATE tb_blog SET title = '${data.updateTitle}', content = '${data.updateContent}', image = '${image}' WHERE id = ${id}`

    db.connect(function(err, client, done)  {

        if (err) throw err

        client.query(query, function(err, result){
            if (err) throw err

            res.redirect('/blog1')
        })
    })
})

app.get('/blog-detail/:id', function(req, res){
    
    let id = req.params.id

    db.connect(function(err, client, done) {

        if (err) throw err

        client.query(`SELECT * FROM tb_blog WHERE id = ${id}`, function(err, result) {
            if (err) throw err

            let data = result.rows[0]

            res.render("blog-detail", {id: id, blog: data})
        })
    })
})

app.listen(5000, function(){
    console.log("Server starting on PORT 5000");
})