const stripe = Stripe('pk_test_51JORimGD9lUbL2TO1Ps9oPadXkBUR4BQx7QSg25QpYas64R75IGvsbVlvGfcMQOLwQxyWKadxQS2AMoDuk2IoXev00BanDlllA');

const elements = stripe.elements();
const cardElement = elements.create('card');
cardElement.mount('#card-element');

function initializePayment() {
    return fetch('/payments', { method: 'POST'}).then(res => res.json());
}

async function confirmPayment(clientSecret) {
    const result = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
    card: cardElement,
    },
});
    if (result.error) {
        console.error(result.error);
    } else {
        alert('Thank you for your business!');
    }

}


document.getElementById('pay-button').addEventListener('click', async () => {
    const {clientSecret} = await initializePayment();
    confirmPayment(clientSecret);
})