import './stripe-page.html';
import './stripe-page.less';

import { Meteor } from 'meteor/meteor';
import { Template } from 'meteor/templating';
import { Session } from 'meteor/session';

import { Users } from '../../../api/users/users.js';

Template.stripe_page.onRendered(function() {
	Session.set('customer_invoices', null);
	Session.set('subscription_status', null);

	this.autorun(() => {
		const user = Meteor.user();

		if (user && user.profile && user.profile.isSubscribed) {
			Meteor.call('get_customer_invoices', function(err, response) {
				if (err) {
					console.error(err.toString());
				} else {
					Session.set('customer_invoices', response);
				}
			});
		}
 
		if (user) {
			Meteor.call('get_user_subscription_status', function(err, response) {
				if (err) {
					console.error(err.toString());
				} else {
					Session.set('subscription_status', response);
				}
			});
		}
	});
});

Template.stripe_page.helpers({
	plans() {
		const plans = Meteor.settings.public.plans;

		if (plans) {
			return plans;
		}
	},
	get_subscription_status() {
		const status = Session.get('subscription_status');

		if (status) {
			return status;
		}
	},
    get_customer_invoices() {
    	const invoices = Session.get('customer_invoices');

    	if (invoices && invoices.data && invoices.data.length > 0) {
    		let dataArr = [];

    		invoices.data.forEach((invoice) => {
    			const data = {
    				total: invoice.total / 100,
    				payDate: moment(new Date(invoice.date * 1000)).format('DD MMMM, YYYY HH:mm')
    			};

    			dataArr.push(data);
    		});

    		return dataArr;
    	}
    },
    get_years: function() {
    	const years = [];
    	const currentYear = new Date().getFullYear();
    	const maxYear = currentYear + 50;

    	for (var i = currentYear; i <= maxYear; i++) {
    		const data = {
    			year: i,
    			// Need the year in two digits format for Stripe
    			value: i - 2000
    		};

    		years.push(data);
    	}

    	return years;
    },
    get_months: function() {
    	const months = [{
    		month: '01',
    		value: 1
    	}, {
    		month: '02',
    		value: 2
    	}, {
    		month: '03',
    		value: 3
    	}, {
    		month: '04',
    		value: 4
    	}, {
    		month: '05',
    		value: 5
    	}, {
    		month: '06',
    		value: 6
    	}, {
    		month: '07',
    		value: 7
    	}, {
    		month: '08',
    		value: 8
    	}, {
    		month: '09',
    		value: 9
    	}, {
    		month: '10',
    		value: 10
    	}, {
    		month: '11',
    		value: 11
    	}, {
    		month: '12',
    		value: 12
    	}];

    	return months;
    }
});

Template.stripe_page.events({
	'click #subscribe_customer_btn': function(ev, tmpl) {
		const user = Meteor.user(),
			cardNumber = tmpl.find('#credit_card_number').value,
			cardCSV = tmpl.find('#credit_card_csv').value,
			cardYear = tmpl.find('#credit_card_year').value,
			cardMonth = tmpl.find('#credit_card_month').value,
			plan = tmpl.find('#select_subscription_plan').value,
			// coupon = tmpl.find('#coupon_code').value;
			coupon = null;

		if (!user) {
			console.error('You must be logged in to subscribe.');
			return;
		}

		if (!cardNumber) {
			console.error('Invalid card number.');
			return;
		}

		if (!cardCSV) {
			console.error('Invalid card csv.');
			return;
		}

		if (!cardYear) {
			console.error('Invalid card expiration year.');
			return;
		}

		if (!cardMonth) {
			console.error('Invalid card expiration month.');
			return;
		}

		if (!plan) {
			console.error('You must select a plan to subscribe.');
			return;
		}

		$('.subscription-btn').attr('disabled', true);

		Meteor.call('create_subscription', cardNumber, cardCSV, cardYear, cardMonth, function(err, tokenId) {
			if (err) {
				console.error(err);
				$('.subscription-btn').attr('disabled', false);
			} else {
				$('#credit_card_number').val('');
				$('#credit_card_csv').val('');
				$('#credit_card_year').val('');
				$('#credit_card_month').val('');
				$('#coupon_code').val('');

				if (user.profile && user.profile.customerId) {
		            Meteor.call('add_update_payment_source', tokenId, coupon, function(error) {
		                if (error) {
		                } else {
		                }

		                $('.subscription-btn').attr('disabled', false);
		            });
		            
		            Meteor.call('create_update_subscription', plan, function(error) {
		                if (error) {
		                } else {
		                }

		                $('.subscription-btn').attr('disabled', false);
		            });    
		        } else {
		        	Meteor.call('add_payment_and_subscribe', tokenId, plan, coupon, function(error) {
		                if (error) {
		                } else {
		                }

		                $('.subscription-btn').attr('disabled', false);
		            }); 
		        }
			}
		});
	},
	'click #update_card_btn': function(ev, tmpl) {
		const cardNumber = tmpl.find('#update_credit_card_number').value,
			cardCSV = tmpl.find('#update_credit_card_csv').value,
			cardYear = tmpl.find('#update_credit_card_year').value,
			cardMonth = tmpl.find('#update_credit_card_month').value;

		if (!cardNumber) {
			return;
		}

		if (!cardCSV) {
			return;
		}

		if (!cardYear) {
			return;
		}

		if (!cardMonth) {
			return;
		}

		$('.subscription-btn').attr('disabled', true);

		Meteor.call('update_customer_card', cardNumber, cardCSV, cardYear, cardMonth, function(err, tokenId) {
			if (err) {
				$('.subscription-btn').attr('disabled', false);
			} else {
				$('#update_credit_card_number').val('');
				$('#update_credit_card_csv').val('');
				$('#update_credit_card_year').val('');
				$('#update_credit_card_month').val('');

				Meteor.call('add_update_payment_source', tokenId, function(error) {
	                if (error) {
	                } else {
	                }

	                $('.subscription-btn').attr('disabled', false);
	            });
			}
		});
	},
	'click #active_update_plan_btn': function(ev, tmpl) {
		const plan = tmpl.find('#update_subscription_plan').value;

		if (!plan) {
			return;
		}

		$('.subscription-btn').attr('disabled', true);

		Meteor.call('create_update_subscription', plan, function(err) {
			if (err) {
			} else {
	
			}

			$('.subscription-btn').attr('disabled', false);
		});
	},
	'click #cancel_subscription_btn': function(ev) {
		event.preventDefault();

	    const parentNode = $('body')[0];
		const onConfirm = () => {
			$('.subscription-btn').attr('disabled', true);

			Meteor.call('cancel_subscription', function(err, response) {
				if (err) {
			
				} else {
				
				}

				$('.subscription-btn').attr('disabled', false);
			});
		}

		const message = 'Are you sure you want to cancel your subscription?';

		onConfirm();
	},
	'click #delete_card_data_btn': function(ev) {
		event.preventDefault();

	  const parentNode = $('body')[0];
		const onConfirm = () => {
			$('.subscription-btn').attr('disabled', true);

			Meteor.call('delete_customer_data', function(err, response) {
				if (err) {
				
				} else {
			
				}

				$('.subscription-btn').attr('disabled', false);
			});
		}

		const message = 'Are you sure you want to delete your card - This will terminate any active subscriptions?';

		onConfirm();
	}
});