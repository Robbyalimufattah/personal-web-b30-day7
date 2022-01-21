// import postgres pool

const { Pool } = require('pg')

const dbPool = new  Pool({
    database: 'personal_web_b30',
    port: 5432,
    user: 'postgres',
    password: '200198',
    idleTimeoutMillis: 0
})

module.exports = dbPool
