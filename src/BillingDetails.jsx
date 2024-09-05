import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiRequestHandler from "./utils/apiRequestHandler";

// TODO: Update with selected plan or challenge data
const planData = {
	challengeName: "5K Standard Challenge",
	challengeType: "twoStep",
	accountSize: 5000,
	challengePrice: 35,
	platform: "MT5",
	broker: "Haven Capital Grp",
	refundable: true,
	challengeStages: {
		phase1: {
			maxDailyDrawdown: 5,
			maxDrawdown: 12,
			tradingPeriod: "unlimited",
			profitTarget: 10,
			minTradingDays: 5,
			newsTrading: true,
			weekendHolding: true,
			drawdownType: "Equity/balance",
			consistencyRule: true,
			leverage: 30,
			stage: "phase1",
		},
		phase2: {
			maxDailyDrawdown: 5,
			maxDrawdown: 10,
			tradingPeriod: "unlimited",
			profitTarget: 5,
			minTradingDays: 10,
			newsTrading: true,
			weekendHolding: true,
			drawdownType: "Equity/balance",
			consistencyRule: true,
			leverage: 30,
			stage: "phase2",
		},
		funded: {
			maxDailyDrawdown: 5,
			maxDrawdown: 12,
			tradingPeriod: "unlimited",
			profitTarget: null, // Typically, funded accounts may not have a profit target
			minTradingDays: 5, // No minimum trading days in funded stage
			newsTrading: true,
			weekendHolding: true,
			drawdownType: "Equity/balance",
			consistencyRule: true,
			leverage: 30,
			stage: "funded",
		},
	},
};

const generatePassword = () => {
	const capitalLetters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const smallLetters = "abcdefghijklmnopqrstuvwxyz";
	const numbers = "0123456789";
	const specialCharacters = "!@#$%^&*()_+[]{}|;:,.<>?";

	// Ensure at least one of each required type
	let password = "";
	password += capitalLetters[Math.floor(Math.random() * capitalLetters.length)];
	password += smallLetters[Math.floor(Math.random() * smallLetters.length)];
	password += numbers[Math.floor(Math.random() * numbers.length)];
	password += specialCharacters[Math.floor(Math.random() * specialCharacters.length)];

	// Fill the rest of the password length with a mix of all types
	const allCharacters = capitalLetters + smallLetters + numbers + specialCharacters;

	for (let i = password.length; i < 8; i++) {
		// Introduce a time-based factor to ensure uniqueness
		const uniqueIndex =
			Math.floor(Math.random() * allCharacters.length) + (Date.now() % allCharacters.length);
		password += allCharacters[uniqueIndex % allCharacters.length];
	}

	// Shuffle the password to ensure randomness
	password = password
		.split("")
		.sort(() => Math.random() - 0.5)
		.join("");

	return password;
};

// TODO: Update with form data for user registration
// user registration data
const formData = {
	email: "zentexx2023@gmail.com",
	first: "Sajid",
	last: "Abd",
	country: "BD",
	addr: "CTG",
	city: "CTG",
	zipCode: "15314",
	phone: "62525245252",
};

const BillingDetails = () => {
	const createUser = useMutation({
		// user registration taking place here
		mutationFn: (data) => apiRequestHandler("/users/normal-register", "POST", data),

		onSuccess: async (data) => {
			// User registration response
			const userResponse = data;

			// Check if user registration was successful
			if (!userResponse) {
				toast.error("User registration failed.");
				return;
			}

			// TODO: Calculate `subTotal`, `discountPrice`, and `totalPrice` based on `planData` and any applied discounts
			const orderData = {
				orderItems: [planData],
				paymentMethod: "Stripe", // TODO: Update with selected payment method, will be dynamic
				buyerDetails: {
					email: userResponse.email,
					first: userResponse.first,
					last: userResponse.last,
					country: userResponse.country,
					addr: userResponse.addr,
					city: userResponse.city,
					zipCode: userResponse.zipCode,
					phone: userResponse.phone,
					userId: userResponse._id,
					password: userResponse.password, // Ensure secure handling of passwords
				},
				subtotal: 0, // TODO: Update with calculated subtotal
				discountPrice: 0, // TODO: Update with calculated discount price
				totalPrice: 0, // TODO: Update with calculated total price
				// couponClaimed: couponData._id, // TODO: Uncomment and use if applicable
			};

			try {
				// Create the order for the user
				const orderResponse = await apiRequestHandler("/orders/create-order", "POST", orderData);

				// Check if order creation was successful
				if (!orderResponse) {
					toast.error("Failed to create order.");
					return;
				}

				// Update the user with the new order ID
				const updateUser = await apiRequestHandler(`/users/${userResponse._id}`, "PUT", {
					orders: [orderResponse._id],
				});

				// Check if user update with order ID was successful
				if (!updateUser) {
					toast.error("Failed to update user with new order.");
					return;
				}

				// TODO :: Simulate payment status (this should be handled by your payment processor)
				const paymentIsDone = true;

				if (paymentIsDone) {
					// Update order status and payment status if payment was successful
					const orderStatusUpdate = await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
						orderStatus: "Accepted",
						paymentStatus: "Paid",
					});

					// Check if order status update was successful
					if (
						orderStatusUpdate?.updatedOrder?.paymentStatus !== "Paid" ||
						orderStatusUpdate?.updatedOrder?.orderStatus !== "Accepted"
					) {
						toast.error("Order or payment status update failed.");
						return;
					}

					// Update user purchase products after order is placed
					const updateUserPurchaseProducts = await apiRequestHandler(
						`/users/${userResponse._id}/purchased-products`,
						"PUT",
						{
							productId: orderResponse.orderId,
							product: planData, // TODO: Update with actual challenge data
						}
					);

					// Check if updating user purchase products was successful
					if (!updateUserPurchaseProducts) {
						toast.error("Failed to update user purchased products.");
						return;
					}

					// Create MT5 account

					// TODO: Create MT5 account through API integration

					const mt5SignUpData = {
						EMail: userResponse.email,
						master_pass: generatePassword(),
						investor_pass: generatePassword(),
						amount: planData.accountSize,
						// FirstName: userResponse.first,
						FirstName: `summitstrike - ${planData?.challengeName} ${userResponse.first} ${
							userResponse.first
						} (${planData?.challengeType === "twoStep" ? "phase1" : "funded"})`,
						LastName: userResponse.last,
						Country: userResponse.country,
						Address: userResponse.addr,
						City: userResponse.city,
						ZIPCode: userResponse.zipCode,
						Phone: userResponse.phone,
						Leverage: 30,
						Group: "demo\\ecn-demo-1",
					};
					console.log("🚀 ~ onSuccess: ~ mt5SignUpData:", mt5SignUpData);

					const createUser = await apiRequestHandler("/users/create-user", "POST", mt5SignUpData);
					console.log("🚀 ~ onSuccess: ~ createUser:", createUser);

					// Check if MT5 account creation was successful
					if (!createUser) {
						await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
							orderStatus: "Processing", // Set to Processing if MT5 account creation fails
						});
						toast.error("Failed to create MT5 account.");
						return;
					}

					if (createUser) {
						//! Section start: MT5 account creation through API
						// TODO: This section will be updated after actual api call
						const productId =
							updateUserPurchaseProducts.data.purchasedProducts[orderResponse.orderId].productId;

						const product =
							updateUserPurchaseProducts.data.purchasedProducts[orderResponse.orderId].product;

						// Determine challenge stage based on product type
						const challengeStage = product?.challengeType === "funded" ? "funded" : "phase1";
						// Prepare challenge stage data for injecting MT5 account in user's collection
						const challengeStageData = {
							...product,
							challengeStages: {
								...product.challengeStages,
								phase1: challengeStage === "funded" ? null : product.challengeStages.phase1,
								phase2:
									challengeStage === "funded" || challengeStage === "phase1"
										? null
										: product.challengeStages.phase2,
								funded: challengeStage === "phase1" ? null : product.challengeStages.funded,
							},
						};

						// Simulated MT5 account data
						const mt5Data = {
							account: createUser.login, // Replace with the new account number,
							investorPassword: createUser.investor_pass,
							masterPassword: createUser.master_pass,
							productId: productId,
							challengeStage: challengeStage,
							challengeStageData: challengeStageData,
							group: mt5SignUpData.Group,
						};

						//! Section ends: MT5 account creation through API

						// Inject MT5 account data in user's collection
						const updateMT5Account = await apiRequestHandler(`/users/${userResponse._id}`, "PUT", {
							mt5Accounts: [mt5Data],
						});

						// Check if MT5 account update was successful
						if (!updateMT5Account) {
							toast.error("Failed to update user MT5 account.");
							return;
						}

						// Update the order status to Delivered
						const updateOrderStatus = await apiRequestHandler(
							`/orders/${orderResponse._id}`,
							"PUT",
							{
								orderStatus: "Delivered",
							}
						);

						// Check if order status update to Delivered was successful
						if (!updateOrderStatus) {
							toast.error("Failed to update order status to Delivered.");
							return;
						}

						// Update the user's role to trader
						await apiRequestHandler(`/users/${userResponse._id}`, "PUT", {
							role: "trader",
						});

						// Notify user of successful payment processing
						toast.success("Payment processed successfully!");
					}
				}
			} catch (error) {
				// Log the error and notify the user
				console.error("🚀 ~ onSuccess error:", error);
				toast.error(`An error occurred during the process: ${error.message}`);
			}
		},
	});

	const onSubmit = async (event) => {
		event.preventDefault();

		await createUser.mutateAsync(formData);
	};

	// Combining the loading states

	return (
		<section className="max-w-[1440px] mx-auto h-screen">
			<div className="flex justify-center items-center h-full">
				<button
					onClick={(e) => onSubmit(e)}
					type="submit"
					className="px-10 py-2 bg-blue-600 hover:bg-blue-500 duration-500 rounded-md w-2/4 text-white font-bold">
					{createUser.isPending ? "Processing..." : "Proceed"}
				</button>
			</div>
		</section>
	);
};

export default BillingDetails;
