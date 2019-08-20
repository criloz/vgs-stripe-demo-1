var f = VGSCollect.create('{{VAULT_ID}}');

f.field('#hidden', {
    type: 'text',
    name: 'hidden',
});

var elements = document.querySelectorAll('label');
for (var i = 0; i < elements.length; i++) {
    elements[i].addEventListener('click', function (t) {
        field.focus();
    });
}

document.getElementById('cc-form')
    .addEventListener('submit', function (e) {
        var targetForm = e.target;
        e.preventDefault();
        var form_error = $("#form-error");
        var valid_form = true;
        var keys = Object.keys(f.state);
        for (var key = 0; key < keys.length; key++) {
            valid_form = valid_form && f.state[keys[key]].isValid;
        }
        if (!valid_form) {
            return
        }
        form_error.text("");
        form_error.hide();
        $('#purchase-btn').prepend('<span id="purchase-loader" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>');
        $('#purchase-btn').prop('disabled', true);

        if (!PaymentRequest) {
            //redirect to normal form
            window.location.replace('/');
        }
        var supportedInstruments = [{
            supportedMethods: "basic-card",
        }];

        var details = {
            total: {
                label: 'Total',
                amount: {currency: 'USD', value: parseInt($("#cc-amount").val()) / 100}
            }
        };

        var options = {
            requestShipping: false,
            requestPayerEmail: false,
            requestPayerPhone: false,
            requestPayerName: true
        };

        // Initialization
        var request = new PaymentRequest(supportedInstruments, details, options);


        // Show UI then continue with user payment info
        request.show().then(result => {
            var data = {
                cardNumber: result.details.cardNumber,
                cardName: result.payerName,
                amount: $("#cc-amount").val(),
                cardExpirationDate: result.details.expiryMonth + "/" + result.details.expiryYear,
                cardCvc: result.details.cardSecurityCode,
            };

            //submit and send the amount of the transaction
            f.submit('/post', {data: data}, function (status, data) {
                $('#purchase-loader').remove();
                $('#purchase-btn').prop('disabled', false);
                if (data && data.kind) {
                    if (data.kind === "transaction_succeeded_without_3ds") {
                        //close modal
                        parent.postMessage({
                            kind: "close-modal",
                            data: {kind: "transaction_succeeded_without_3ds"}
                        }, "*");
                        window.location.replace('/confirm_3ds.html?transaction_succeeded_without_3ds=true&transaction_id=' + data.transaction_id);

                    } else if (data.kind === "action_redirect") {
                        //close modal
                        window.location.replace(data.redirect_url);
                    } else if (data.kind === "error") {
                        form_error.text(data.message);
                        form_error.show();
                    }
                }
                cleanErrorMessages(targetForm);
            }, function (errors) {
                highlightErrors(targetForm, errors);
            });

        }).catch(function (err) {
            $('#purchase-loader').remove();
            $('#purchase-btn').prop('disabled', false);
            console.error('Uh oh, something bad happened: ' + err.message);
        });


    }, false);
