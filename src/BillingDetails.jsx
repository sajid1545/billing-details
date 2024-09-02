import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import apiRequestHandler from "./utils/apiRequestHandler";

const planData = {
	challengeName: "ProTrader Challenge",
	challengeType: "twoStep",
	accountSize: 100000,
	challengePrice: 500,
	platform: "MetaTrader 5",
	broker: "XYZ Broker",
	status: "active",
	refundable: true,
	challengeStages: {
		phase1: {
			maxDailyDrawdown: 5,
			maxDrawdown: 10,
			tradingPeriod: "30 days",
			profitTarget: 8,
			minTradingDays: 10,
			newsTrading: true,
			weekendHolding: false,
			drawdownType: "equity",
			consistencyRule: true,
			leverage: 100,
			stage: "Phase 1",
		},
		phase2: {
			maxDailyDrawdown: 5,
			maxDrawdown: 10,
			tradingPeriod: "60 days",
			profitTarget: 5,
			minTradingDays: 10,
			newsTrading: true,
			weekendHolding: false,
			drawdownType: "equity",
			consistencyRule: true,
			leverage: 100,
			stage: "Phase 2",
		},
		funded: {
			maxDailyDrawdown: 5,
			maxDrawdown: 10,
			tradingPeriod: "Indefinite",
			profitTarget: 0,
			minTradingDays: 0,
			newsTrading: true,
			weekendHolding: true,
			drawdownType: "balance",
			consistencyRule: false,
			leverage: 50,
			stage: "Funded",
		},
	},
};

const formData = {
	email: "sajid2@gmail.com",
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
		//   user registration taking place here
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
						orderStatusUpdate.paymentStatus !== "Paid" ||
						orderStatusUpdate.orderStatus !== "Accepted"
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
					const mt5CreatedThroughApi = true; // Simulated response, replace with actual API call

					// Check if MT5 account creation was successful
					if (!mt5CreatedThroughApi) {
						await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
							orderStatus: "Processing", // Set to Processing if MT5 account creation fails
						});
						toast.error("Failed to create MT5 account.");
						return;
					}

					if (mt5CreatedThroughApi) {
						//! Section start: MT5 account creation through API
						// TODO: This section will be updated after actual api call
						const productId =
							updateUserPurchaseProducts.data.purchasedProducts[orderResponse.orderId].productId;

						const product =
							updateUserPurchaseProducts.data.purchasedProducts[orderResponse.orderId].product;

						// Determine challenge stage based on product type
						let challengeStage = product?.challengeType === "funded" ? "funded" : "phase1";
						// Prepare challenge stage data for injecting MT5 account in user's collection
						const challengeStageData = {
							...product,
							challengeStages: {
								...product.challengeStages,
								phase1: challengeStage === "funded" ? null : product.challengeStages.phase1,
								phase2: challengeStage === "funded" ? null : product.challengeStages.phase2,
								funded: challengeStage === "phase1" ? null : product.challengeStages.funded,
							},
						};

						// Simulated MT5 account data
						const mt5Data = {
							account: 999232, // Example account number
							password: "43252@!", // Example password (ensure secure handling)
							productId: productId,
							challengeStage: challengeStage,
							challengeStageData: challengeStageData,
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

		toast.success("Payment processed successfully!");
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
