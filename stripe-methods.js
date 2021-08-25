import bodyParser from 'body-parser';
import stripePackage from 'stripe';
const stripe = stripePackage(Meteor.settings.private.stripeSecretKey);

import { Users } from '../../api/users/users.js';
import { Pitches } from '../../api/pitches/pitches.js';
import { Payments } from '../../api/payments/payments.js';

function createCustomer(customerData, callback) {
	stripe.customers.create(customerData, function(error, customer) {
		let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        	data.customer = customer;
        }

        callback(null, data);
    });
}

function updateCustomer(customerId, customerData, callback) {
	stripe.customers.update(customerId, customerData, function(error, card) {
        let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        }

        callback(null, data);
	});
}

function createSubscription(customerId, plan, callback) {
	stripe.subscriptions.create({
		plan: plan,
		customer: customerId
	}, function(error, subscription) {
        let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        	data.subscription = subscription;
        }

        callback(null, data);
    });
}

function updateSubscription(subscriptionId, plan, callback) {
	stripe.subscriptions.update(subscriptionId, {
		plan: plan
	}, function(error, subscription) {
        let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        	data.subscription = subscription;
        }

        callback(null, data);
    });
}


function createToken(cardNumber, csv, expirableYear, expirableMonth, callback) {
	stripe.tokens.create({
	  	card: {
		    number: cardNumber,
            cvc: csv,
            exp_year: expirableYear,
            exp_month: expirableMonth
	  	}
	}, function(error, token) {
		let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        	data.tokenId = token.id;
        }

        callback(null, data);
    });
}

function addCoupon(customerId, coupon, callback) {
	stripe.customers.update(customerId, {
		coupon: coupon
	}, function(error, response) {
		let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        }

        callback(null, data);
    });
}

function deleteSubscription(subscriptionId, callback) {
	stripe.subscriptions.del(subscriptionId, function(error, confirmation) {
    	let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        	data.confirmation = confirmation;
        }

        callback(null, data);
	});
}

function deleteCustomer(customerId, callback) {
	stripe.customers.del(customerId, function(error, confirmation) {
    	let data = { };

        if (error) {
        	data.isError = true;
        	data.error = error;
        } else {
        	data.isError = false;
        	data.confirmation = confirmation;
        }

        callback(null, data);
	});
}

function createCharge(customerId, pitchPrice, pitchNum, callback) {
	stripe.charges.create({
		amount: pitchPrice || 185,
		currency: "usd",
		customer: customerId,
		description: pitchNum + " Pitch charge",
		// source: token,
	}, function(err, charge) {
		// asynchronously called
		let data = { };

		if (err) {
        	data.isError = true;
        	data.error = err;
        } else {
        	data.isError = false;
        	data.charge = charge;
		}
		callback(null, data);
	});
}

function donate(customerId, amount, callback) {
	stripe.charges.create({
		amount: amount,
		currency: "usd",
		customer: customerId,
		description: "Donation",
		// source: token,
	}, function(err, charge) {
		// asynchronously called
		let data = { };

		if (err) {
        	data.isError = true;
        	data.error = err;
        } else {
        	data.isError = false;
        	data.charge = charge;
		}
		callback(null, data);
	});
}

function checkPayment(customerId, callback) {
	stripe.customers.retrieve(
	    customerId,
	    function(err, customer) {
			let data = { };

			if (err) {
	        	data.isError = true;
	        	data.error = err;
	        } else {
	        	data.isError = false;
	        	data.sources = customer.sources.data;
			}
			callback(null, data);
	    }
	);
}

const wrappedCreateCustomer = Async.wrap(createCustomer);
const wrappedUpdateCustomer = Async.wrap(updateCustomer);
const wrappedCreateSubscription = Async.wrap(createSubscription);
const wrappedUpdateSubscription = Async.wrap(updateSubscription);
const wrappedCreateToken = Async.wrap(createToken);
const wrappedAddCoupon = Async.wrap(addCoupon);
const wrappedDeleteSubscription = Async.wrap(deleteSubscription);
const wrappedDeleteCustomer = Async.wrap(deleteCustomer);
const wrappedCreateCharge = Async.wrap(createCharge);
const wrappedDonate = Async.wrap(donate);
const wrappedcheckPayment = Async.wrap(checkPayment);

Meteor.startup(() => {
	Picker.middleware(bodyParser.urlencoded({ extended: false }));
    Picker.middleware(bodyParser.json());

    const webhooks = Picker.filter(function(req, res) {
      	return req.method === 'POST';
    });

    webhooks.route('/api/webhooks/stripe', function(params, req, res, next) {
        let event_json = req.body;

        if (event_json && event_json.data && event_json.data.object) {
    		// Subscription - Created
	        if (event_json.type === 'customer.subscription.created') {
	        	const customerId = event_json.data.object.customer,
        			subscriptionId = event_json.data.object.id,
        			plan = event_json.data.object.plan.id;

                const user = Users.findOne({
	    			'profile.customerId': customerId
	    		});

	    		if (user) {
	    			Users.update({
		    			_id: user._id
		    		}, {
		    			$set: {
		    				'profile.isSubscribed': true,
		    				'profile.subscriptionId': subscriptionId,
		    				'profile.plan': plan,
		    				'profile.failureMessage': null
		    			}
		    		});
	    		}
	        }

	        // Subscription - Updated
	        if (event_json.type === 'customer.subscription.updated') {
	        	const customerId = event_json.data.object.customer,
        			subscriptionId = event_json.data.object.id,
        			plan = event_json.data.object.plan.id;

                const user = Users.findOne({
	    			'profile.customerId': customerId
	    		});

	    		if (user) {
	    			Users.update({
		    			_id: user._id
		    		}, {
		    			$set: {
		    				'profile.isSubscribed': true,
		    				'profile.subscriptionId': subscriptionId,
		    				'profile.plan': plan,
		    				'profile.failureMessage': null
		    			}
		    		});
	    		}
	        }

	        // Customer - Deleted
	        if (event_json.type === 'customer.deleted') {
	        	const customerId = event_json.data.object.id;

	        	const user = Users.findOne({
	    			'profile.customerId': customerId
	    		});

	    		if (user) {
	    			Users.update({
		    			_id: user._id
		    		}, {
		    			$set: {
		    				'profile.isSubscribed' : false,
					        'profile.plan' : null,
					        'profile.customerId' : null,
					        'profile.subscriptionId' : null,
					        'profile.subscriptionEndDate' : null,
					        'profile.paymentStatus' : 'customer_deleted',
					        'profile.failureMessage': 'Your card data was deleted.'
		    			}
		    		});
	    		}
	        }

	        // Subscription - Deleted
	        if (event_json.type === 'customer.subscription.deleted') {
	        	const customerId = event_json.data.object.customer,
        			subscriptionId = event_json.data.object.id;

	        	const user = Users.findOne({
	    			'profile.customerId': customerId,
	    			'profile.subscriptionId': subscriptionId
	    		});

	    		if (user) {
	    			Users.update({
		    			_id: user._id
		    		}, {
		    			$set: {
		    				'profile.subscriptionId': null,
		    				'profile.subscriptionEndDate': null,
		    				'profile.isSubscribed': false,
		    				'profile.plan' : null,
		    				'profile.paymentStatus' : 'subscription_deleted',
		    				'profile.failureMessage': 'Your subscription was deleted.'
		    			}
		    		});
	    		}
	        }

	        // Payment - Succeeded
            if (event_json.type === 'invoice.payment_succeeded') {
	            const customerId = event_json.data.object.customer,
	            	subscriptionEndDate = new Date(event_json.data.object.period_end * 1000);

	            const user = Users.findOne({
	    			'profile.customerId': customerId
	    		});

	            if (user) {
	            	Users.update({
		    			_id: user._id
		    		}, {
		    			$set: {
		    				'profile.paymentStatus': 'paid',
		    				'profile.subscriptionEndDate': subscriptionEndDate,
		    				'profile.failureMessage': null,
		    				'profile.warningEmailSent': false
		    			}
		    		});
	            }
	        }

	        // Payment - Failed
	        if (event_json.type === 'invoice.payment_failed') {
	        	const customerId = event_json.data.object.customer,
	        		failureCode = event_json.data.object.failure_code,
	        		failureMessage = event_json.data.object.failure_message,
	        		getChargeAttempts = event_json.data.object.attempt_count;

    			const user = Users.findOne({
	    			'profile.customerId': customerId
	    		});

	    		if (user) {
	    			Users.update({
		    			_id: user._id
		    		}, {
		    			$set: {
		    				'profile.paymentStatus': failureCode,
		    				'profile.failureMessage': failureCode
		    			}
		    		});

		    		if (getChargeAttempts >= 3) {
		    			if (!user.profile.warningEmailSent) {
		    				Meteor.call('send_warining_email', user.emails[0].address, function(error) {
		                        if (error) {
		                            console.log(error);
		                        } else {
		                            Users.update({
		                                _id: user._id
		                            }, {
		                                $set: {
		                                    'profile.warningEmailSent': true
		                                }
		                            });
		                        }
		                    });
		    			}
		    		}
	    		}
	        }

	        // Charge - Failed
	        if (event_json.type === 'charge.failed') {
	        	const customerId = event_json.data.object.customer,
	        		failureCode = event_json.data.object.failure_code,
	        		failureMessage = event_json.data.object.failure_message;

    			const user = Users.findOne({
	    			'profile.customerId': customerId,
	    			'profile.failureMessage': failureCode
	    		});

	    		if (user) {
	    			Users.update({
		    			_id: user._id
		    		}, {
		    			$set: {
		    				'profile.paymentStatus': failureCode,
		    				'profile.failureMessage': failureCode
		    			}
		    		});
	    		}
	        }

	        res.writeHead(200, {
	            'Content-Type': 'text/plain',
	            'Trailer': 'Content-MD5'
	        });

	        res.end();
	    }
    });
});

Meteor.methods({
	create_subscription: function(cardNumber, csv, expirableYear, expirableMonth) {
		const userId = this.userId;

		const user = Users.findOne({ _id: userId });

		if (!user) {
			throw new Meteor.Error(500, 'You must be logged in to subscribe.');
		}

		if (!cardNumber) {
			throw new Meteor.Error(500, 'Invalid card number.');
		}

		if (!csv) {
			throw new Meteor.Error(500, 'Invalid card csv.');
		}

		if (!expirableYear) {
			throw new Meteor.Error(500, 'Invalid card expiration year.');
		}

		if (!expirableMonth) {
			throw new Meteor.Error(500, 'Invalid card expiration month.');
		}

		const stripeResponse = wrappedCreateToken(cardNumber, csv, expirableYear, expirableMonth);

		if (stripeResponse.isError) {
			throw new Meteor.Error(stripeResponse.error.message);
		} else {
			return stripeResponse.tokenId;
		}
    },
    'add_payment_and_subscribe': function(tokenId, plan, coupon) {
        const userId = this.userId;
        const user = Users.findOne({ _id: userId });

        if (!user) {
        	throw new Meteor.Error(500, 'You must be logged to activate subscription.');
        }

        if (!tokenId) {
        	throw new Meteor.Error(500, 'Invalid payment data.');
        }

        if (!user.profile.customerId) {
        	const email = user.emails[0].address;
        	let data = {
        		source: tokenId,
                email: email,
                plan: plan
        	};

        	if (coupon) {
        		data.coupon = coupon;
        	}

            const stripeResponse = wrappedCreateCustomer(data);

            if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			} else {
				Users.update({
            		_id: userId
            	}, {
            		$set: {
            			'profile.customerId': stripeResponse.customer.id,
            			'profile.plan':  stripeResponse.customer.subscriptions.data[0].plan.id,
            			'profile.subscriptionId': stripeResponse.customer.subscriptions.data[0].id,
            			'profile.isSubscribed': true,
            			'profile.paymentStatus' : null
            		}
            	});
			}
        } else {
        	throw new Meteor.Error(500, 'Customer data already exists.');
        }
    },
    'create_customer': function(tokenId, coupon) {
        const userId = this.userId;
        const user = Users.findOne({ _id: userId });

        if (!user) {
        	throw new Meteor.Error(500, 'You must be logged to add a card.');
        }

        if (!tokenId) {
        	throw new Meteor.Error(500, 'Invalid payment data.');
        }

        if (!user.profile || (user.profile && !user.profile.customerId)) {
        	const email = user.emails[0].address;
        	let data = {
        		source: tokenId,
                email: email
        	};

        	if (coupon) {
        		data.coupon = coupon;
        	}

            const stripeResponse = wrappedCreateCustomer(data);

            if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			} else {
				Users.update({
            		_id: userId
            	}, {
            		$set: {
            			'profile.customerId': stripeResponse.customer.id
            		}
            	});
			}
        } else {
        	throw new Meteor.Error(500, 'Customer data already exists.');
        }
    },
    'add_update_payment_source': function(tokenId, coupon) {
        const userId = this.userId;
        const user = Users.findOne({ _id: userId });

        if (!user) {
        	throw new Meteor.Error(500, 'You must be logged to add payment source.');
        }

        if (user.profile && user.profile.customerId) {
            const customerId = user.profile.customerId;
            let data = {
            	source: tokenId
            };

            if (coupon) {
            	data.coupon = coupon;
            }

            const stripeResponse = wrappedUpdateCustomer(customerId, data);

            if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			}
        } else {
            throw new Meteor.Error(500, 'You must be logged to add payment source.');
        }
    },
    'create_update_subscription': function(plan) {
        const userId = this.userId;
        const user = Users.findOne({ _id: userId }),
        	plans = Meteor.settings.public.plans,
			plansArr = [];

	 	if (!user) {
        	throw new Meteor.Error(500, 'You must be logged to update subscription.');
        }

		plans.forEach((plan) => {
			plansArr.push(plan.id);
		});

		if (plansArr.indexOf(plan) < 0) {
			throw new Meteor.Error(500, 'Invalid subscription plan.');
		}

        if (user.profile && user.profile.customerId) {
            const customerId = user.profile.customerId,
            	subscriptionId = user.profile.subscriptionId;

        	let stripeResponse = null;

        	if (subscriptionId) {
        		stripeResponse = wrappedUpdateSubscription(subscriptionId, plan);
        	} else {
        		stripeResponse = wrappedCreateSubscription(customerId, plan);
        	}

        	if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			} else {
        		Users.update({
	    			_id: userId
	    		}, {
	    			$set: {
	    				'profile.isSubscribed': true,
	    				'profile.subscriptionId': stripeResponse.subscription.id,
	    				'profile.plan': stripeResponse.subscription.plan.id
	    			}
	    		});
        	}
        } else {
            throw new Meteor.Error(500, 'Customer account not found.');
        }
    },
    get_customer_invoices: function() {
    	const userId = this.userId;
    	const user = Users.findOne({ _id: userId });

        if (!user) {
        	throw new Meteor.Error(500, 'You must be logged to add payment source.');
        }

        if (user.profile && user.profile.customerId) {
            const invoices = stripe.invoices.list({
            	limit: 5,
            	customer: user.profile.customerId
            }).then(function(custInvoices) {
				return custInvoices;
			});

			return invoices;
        }
    },
    update_customer_card: function(cardNumber, csv, expirableYear, expirableMonth) {
    	const userId = this.userId;
		const user = Users.findOne({ _id: userId });

		if (!user) {
			throw new Meteor.Error(500, 'You must be logged in to subscribe.');
		}

		if (!cardNumber) {
			throw new Meteor.Error(500, 'Invalid card number.');
		}

		if (!csv) {
			throw new Meteor.Error(500, 'Invalid card csv.');
		}

		if (!expirableYear) {
			throw new Meteor.Error(500, 'Invalid card expiration year.');
		}

		if (!expirableMonth) {
			throw new Meteor.Error(500, 'Invalid card expiration month.');
		}

		expirableYear = Number(expirableYear);
		expirableMonth = Number(expirableMonth);

		const currentYear = new Date().getFullYear() - 2000,
			currentMonth = new Date().getMonth() + 1;

		if (expirableYear < currentYear || expirableYear > 99) {
			throw new Meteor.Error(500, 'Invalid card expiration year.');
		} else if (expirableYear === currentYear) {
			if (expirableMonth < currentMonth) {
				throw new Meteor.Error(500, 'Invalid card expiration month.');
			}
		} else if (expirableMonth > 12 || expirableMonth <= 0) {
			throw new Meteor.Error(500, 'Invalid card expiration month.');
		}

		const stripeResponse = wrappedCreateToken(cardNumber, csv, expirableYear, expirableMonth);

		if (stripeResponse.isError) {
			throw new Meteor.Error(stripeResponse.error.message);
		} else {
			return stripeResponse.tokenId;
		}
    },
    use_coupon: function(coupon) {
    	const userId = this.userId;
		const user = Users.findOne({ _id: userId });

		if (!user) {
			throw new Meteor.Error(500, 'You must be logged in to subscribe.');
		}

		if (!coupon) {
			throw new Meteor.Error(500, 'Invalid voucher.');
		}

    	if (user.profile && user.profile.customerId) {
            const customerId = user.profile.customerId;

            const stripeResponse = wrappedAddCoupon(customerId, coupon);

			if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			}
        } else {
            throw new Meteor.Error(500, 'You must be subscribed to update your subscription.');
        }
    },
    cancel_subscription: function() {
		const userId = this.userId;
        const user = Users.findOne({ _id: userId });

        if (!user) {
        	throw new Meteor.Error(500, 'You must be logged to update your subscription.');
        }

        if (user.profile && user.profile.customerId) {
            const customerId = user.profile.customerId,
            	subscriptionId = user.profile.subscriptionId;

        	if (subscriptionId) {
        		const stripeResponse = wrappedDeleteSubscription(subscriptionId);

				if (stripeResponse.isError) {
					throw new Meteor.Error(stripeResponse.error.message);
				} else {
					Users.update({
                		_id: userId
                	}, {
                		$set: {
                			'profile.subscriptionId': null,
	    					'profile.subscriptionEndDate': null,
	    					'profile.isSubscribed': false,
	    					'profile.plan': null,
	    					'profile.paymentStatus' : 'subscription_deleted'
                		}
                	});
				}
        	} else {
        		throw new Meteor.Error(500, 'You must be subscribed to cancel a subscription.');
        	}
        } else {
            throw new Meteor.Error(500, 'You must be subscribed to cancel a subscription.');
        }
    },
    delete_customer_data: function() {
		const userId = this.userId;
		const user = Users.findOne({ _id: userId });

		if (!user) {
			throw new Meteor.Error(500, 'You must be logged to remove data.');
		}

		if (user.profile && user.profile.customerId) {
            const customerId = user.profile.customerId;
            const stripeResponse = wrappedDeleteCustomer(customerId);

			if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			} else {
				Users.update({
            		_id: userId
            	}, {
            		$set: {
	    				'profile.isSubscribed' : false,
				        'profile.plan' : null,
				        'profile.customerId' : null,
				        'profile.subscriptionId' : null,
				        'profile.subscriptionEndDate' : null,
				        'profile.paymentStatus' : 'customer_deleted'
	    			}
            	});
			}
        } else {
            throw new Meteor.Error(500, 'There is not any data about your subscription.');
        }
    },
    check_is_subscription_expired: function() {
    	const userId = this.userId;
	    const user = Users.findOne({ _id: userId }),
	        plans = Meteor.settings.public.plans;

	    if (!user) {
	        throw new Meteor.Error(500, 'User not found.');
	    }

	    if (user.profile && (user.profile.isSubscribed && user.profile.plan)) {
	        let currentPlan = null;

	        for (var i = 0; i < plans.length; i++) {
	            if (plans[i].id === user.profile.plan) {
	                currentPlan = plans[i];
	            }
	        }

	        if (!currentPlan) {
	            return true;
	        }
	    } else {
	        const today = new Date();
	        const registerDate = new Date(user.createdAt);
	        const checkDate = registerDate.setDate(registerDate.getDate() + 14);

	        if (checkDate < today.getTime()) {
	            return true;
	        }
	    }

	    return false;
    },
    get_user_subscription_status: function() {
    	const userId = this.userId;
    	const user = Users.findOne({ _id: userId });
    	const plans = Meteor.settings.public.plans;

    	if (!user) {
    		throw new Meteor.Error(500, 'User not found.');
    	}

    	if (user.profile && user.profile.isSubscribed) {
    		let currentPlan = null;

	        for (var i = 0; i < plans.length; i++) {
	            if (plans[i].id === user.profile.plan) {
	                currentPlan = plans[i];
	            }
	        }

	        if (!currentPlan) {
	            return 'Invalid Subscription';
	        } else {
	        	return currentPlan.name;
	        }
    	} else {
    		const today = new Date();
	        const registerDate = new Date(user.createdAt);
	        const checkDate = registerDate.setDate(registerDate.getDate() + 14);

	        if (checkDate > today.getTime()) {
	            return 'Trial';
	        }
    	}

    	return 'Not Subscribed';
    },
    check_user_payment_status: function() {
    	const userId = this.userId;
    	const user = Users.findOne({ _id: userId });

    	if (!user) {
    		throw new Meteor.Error(500, 'User not found.');
    	}

    	if (user.profile && user.profile.isSubscribed && user.profile.plan && user.profile.paymentStatus) {
    		if (user.profile.paymentStatus !== 'paid') {
	    		let errorMessage = null;

	    		if (user.profile.failureMessage) {
	    			errorMessage = user.profile.failureMessage;
	    		} else {
	    			errorMessage = 'Your subscription payment failed, please update your card details.';
	    		}

	    		return errorMessage;
	    	} else {
	    		return user.profile.paymentStatus;
	    	}
	    }

	    return 'not_subscribed';
	},
	checkPayment: function() {

    	const userId = this.userId;
    	const user = Users.findOne({ _id: userId });

		if(user.profile && user.profile.customerId) {
	        var customerId = user.profile.customerId;

            const stripeResponse = wrappedcheckPayment(customerId);

			if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			} else {
				return stripeResponse.sources;
			}
		} else {
			return false;
		}
	},
	create_charge: function(pitchId, pitchPrice, campaignId) {
		return;
		// const userId = this.userId;
		// const user = Users.findOne({ _id: userId });
		//
		// if (!user) {
    // 		throw new Meteor.Error(500, 'User not found.');
		// }
		//
		// if (user.profile && user.profile.customerId) {
		// 	let stripeResponse = wrappedCreateCharge(user.profile.customerId, pitchPrice);
    //     	if (stripeResponse.isError) {
		// 		return stripeResponse.error.message;
		// 	} else {
		// 		if (stripeResponse.charge.paid) {
		// 			var payId = Payments.insert({
		// 				userId: userId,
		// 				pitchId: pitchId,
		// 				campaignId: campaignId,
		// 				type: 2,
		// 				stripeId: stripeResponse.charge.id,
		// 				amount: pitchPrice,
		// 				successful:true
		// 			});
		// 			if (payId) {
		// 				Pitches.update({
		// 					_id: pitchId
		// 				}, {
		// 					$set: {
		// 						status : 'active',
		// 						isPaid : true,
		// 						paymentId: payId
		// 					}
		// 				});
		// 			}
		// 			Meteor.call('checkIsSuccessful', campaignId);
		// 		}
    //     	}
	  //   }
	},
	create_charge_new: function(pitchPrice,pitchNum, date, emailText) {
		this.unblock();
		const userId = this.userId;
		const user = Users.findOne({ _id: userId });

		if (!user) {
    		throw new Meteor.Error(500, 'User not found.');
		}

		if (user.profile && user.profile.customerId) {
			let stripeResponse = wrappedCreateCharge(user.profile.customerId, pitchPrice, pitchNum);
        	if (stripeResponse.isError) {
        		if (stripeResponse.error && stripeResponse.error.message) {
        			return stripeResponse.error.message;
        		}else {
        			return "Something has gone wrong. Contact support to figure out the issue."
        		}

			} else {
				// console.log('stripeResponse.charge', stripeResponse.charge);
				if (stripeResponse.charge.paid) {
					var payId = Payments.insert({
						userId: userId,
						type: 2,
						stripeId: stripeResponse.charge.id,
						amount: pitchPrice,
						successful:true
					});
					if (payId) {
						let contents = '"Purchase ID","Username","Email","Pitch Qty","Date","Paid","Amount"';
						let paid = '$1.85';
				        if (pitchNum == 5) {
				            paid = '$8.75';
				        }else if(pitchNum == 10){
				            paid = '$15.70';
				        }else if(pitchNum == 25){
				            paid = '$37';
				        }
						var data = {
							username: user.username,
							email: user.emails[0].address,
							pitch_qty: pitchNum,
							date: date,
							paid:"Yes",
							amount: paid
						};
						contents += '\n"' + payId + '","' + data.username + '","' + data.email + '","' + data.pitch_qty + '","' + data.date + '","' + data.paid + '","' + data.amount + '"';
						emailText.headerFour = emailText.headerFour + payId;
						var filename = "receipt_" + data.username + "_" + date + '.csv',
            			cid_value = data.username + date + '.receipt.csv';
            			var BOM = '\uFEFF';
            			var receipt = {
				            filename: filename,
				            content: BOM + contents,
				            cid: cid_value
				        };
				        //SSR.compileTemplate('email-template', Assets.getText('email-template/email-template.html'));
				        var emailData = {
				            link: Meteor.absoluteUrl(),
				            text: emailText.text,
				            header:emailText.header,
										headerTwo: emailText.headerTwo,
										headerThree: emailText.headerThree,
										headerFour: emailText.headerFour,
				            btn: emailText.button,
				            rootUrl:Meteor.absoluteUrl()
				        };
				        let isSent = Mailer.send({
				          to: data.email,
				          subject: emailText.header,
				          template: 'receiptEmail',
				          data: emailData,
				          attachments: [receipt]
				        });
				        if (isSent) {
				        	console.log("mail successfully sent to " + data.email);
				        }else {
				        	console.log("mail not sent to " + data.email);
				        }
						return {
							payId: payId,
							num: pitchNum
						};
					}
				}
        	}
	    }
	    //return 'not_subscribed';
	},
	donate: function(amount,payId) {
		const userId = this.userId;
		const user = Users.findOne({ _id: userId });

		if (!user) {
    		throw new Meteor.Error(500, 'User not found.');
		}

		if (user.profile && user.profile.customerId) {
			let stripeResponse = wrappedDonate(user.profile.customerId, amount);

        	if (stripeResponse.isError) {
				throw new Meteor.Error(stripeResponse.error.message);
			} else {
				// console.log('stripeResponse.charge', stripeResponse.charge);

				if (stripeResponse.charge.paid) {

					Payments.update_pay_field(payId, 'successful', true);
					Payments.update_pay_field(payId, 'stripeId', stripeResponse.charge.id);
				}
        	}
	    }
	    return 'not_subscribed';
	}
});
