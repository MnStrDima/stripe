const express = require('express');
const stripe = require('stripe')('sk_test_51JORimGD9lUbL2TOdgFE8OdxEDNU84KpY1foctGvLvaPwtOGxQOIzEFrhulbXXVKUBNgDStkCjwGcpG6XynRfg4v00dvDiGLot');

const app = express();

app.use(express.static('public'));
app.post('/payments', async (req, res) => {
    const {client_secret} = await stripe.paymentIntents.create({
        amount: 1000,
        currency: 'usd',
        payment_method_types: ['card'],
    });
    
    res.send(JSON.stringify({clientSecret: client_secret}));
})

app.listen(8080, ()=>console.log('App started on port 8080'));