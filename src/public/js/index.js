var stripePublishableKey = 'pk_test_4VogGryzOpkqxpZehcVTXEKK';
var amount = 1099;
var currency = 'eur';

Stripe.setPublishableKey(stripePublishableKey);

// Create Checkout's handler
var handler = StripeCheckout.configure({
    key: stripePublishableKey,
    image: 'https://stripe.com/img/documentation/checkout/marketplace.png',
    locale: 'auto',
    allowRememberMe: false,
    token: function(token) {
        // use Checkout's card token to create a card source
        Stripe.source.create({
            type: 'card',
            token: token.id
        }, stripeCardResponseHandler);

        displayProcessing();
    }
});

$('#customButton').on('click', function(e) {
    // Open Checkout with further options:
    handler.open({
        name: 'Stripe.com',
        description: '2 widgets',
        amount: amount,
        currency: currency
    });
    e.preventDefault();
});



function stripeCardResponseHandler(status, response) {
    if (response.error) {
        var message = response.error.message;
        displayResult("Unexpected card source creation response status: " + status + ". Error: " + message);
        return;
    }

    // check if the card supports 3DS
    if (response.card.three_d_secure == 'not_supported') {
        displayResult("This card does not support 3D Secure.");
        return;
    }

    // since we're going to use an iframe in this example, the
    // return URL will only be displayed briefly before the iframe
    // is closed. Set it to a static page on your site that says
    // something like "Please wait while your transaction is processed"
    var returnURL = "https://shop.example.com/static_page";

    // create the 3DS source from the card source
    Stripe.source.create({
        type: 'three_d_secure',
        amount: 1099,
        currency: "eur",
        three_d_secure: {
            card: response.id
        },
        redirect: {
            return_url: returnURL
        }
    }, stripe3DSecureResponseHandler);
}

function stripe3DSecureResponseHandler(status, response) {
    if (response.error) {
        var message = response.error.message;
        displayResult("Unexpected 3DS source creation response status: " + status + ". Error: " + message);
        return;
    }

    // check the 3DS source's status
    if (response.status == 'chargeable') {
        displayResult("This card does not support 3D Secure authentication, but liability will be shifted to the card issuer.");
        return;
    } else if (response.status != 'pending') {
        displayResult("Unexpected 3D Secure status: " + response.status);
        return;
    }

    // start polling the source (to detect the change from pending
    // to either chargeable or failed)
    Stripe.source.poll(
        response.id,
        response.client_secret,
        stripe3DSStatusChangedHandler
    );

    // open the redirect URL in an iframe
    // (in this example we're using Featherlight for convenience,
    // but this is of course not a requirement)
    $.featherlight({
        iframe: response.redirect.url,
        iframeWidth: '800',
        iframeHeight: '600'
    });

    console.log(response);
}

function stripe3DSStatusChangedHandler(status, source) {
    if (source.status == 'chargeable') {
        $.featherlight.current().close();
        var msg = '3D Secure authentication succeeded: ' + source.id + '. In a real app you would send this source ID to your backend to create the charge.';
        displayResult(msg);
    } else if (source.status == 'failed') {
        $.featherlight.current().close();
        var msg = '3D Secure authentication failed.';
        displayResult(msg);
    } else if (source.status != 'pending') {
        $.featherlight.current().close();
        var msg = "Unexpected 3D Secure status: " + source.status;
        displayResult(msg);
    }
}
