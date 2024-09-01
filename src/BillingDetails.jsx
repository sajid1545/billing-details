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
			profitTarget: 8000,
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
			profitTarget: 5000,
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
	email: "sajid@gmail.com",
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
		mutationFn: (data) =>
			apiRequestHandler("/users/normal-register", "POST", data),

		onSuccess: async (data) => {
			// const paymentStatus = true;

			try {
				// User registration response
				const userResponse = data;

				// Check if user registration was successful
				if (!userResponse) {
					toast.error("User registration failed.");
					return;
				}

				// Prepare order data with user and plan details
				const orderData = {
					orderItems: [planData],
					paymentMethod: "Stripe",
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
						password: userResponse.password,
					},
					subtotal: 0,
					discount_price: 0,
					total_price: 0,
					// couponClaimed: couponData._id,
				};

				// Create the order for the user
				const orderResponse = await apiRequestHandler(
					"/orders/create-order",
					"POST",
					orderData,
				);
				// Check if order creation was successful
				if (!orderResponse) {
					toast.error("Failed to create order.");
					return;
				}

				// Update the user with the new order ID
				const updateUser = await apiRequestHandler(
					`/users/${userResponse._id}`,
					"PUT",
					{
						orders: [orderResponse._id],
					},
				);

				// Check if user update with order ID was successful
				if (!updateUser) {
					toast.error("Failed to update user with new order.");
					return;
				}

				const updateUserPurchaseProducts = await apiRequestHandler(
					`/users/${userResponse._id}/purchased-products`,
					"PUT",
					{
						productId: orderResponse.orderId,
						product: planData,
					},
				);

				if (!updateUserPurchaseProducts) {
					toast.error("Failed to create order.");
					return;
				}

				const productId =
					updateUserPurchaseProducts.data.purchasedProducts[
						orderResponse.orderId
					].productId;

                const product = updateUserPurchaseProducts.data.purchasedProducts[
                    orderResponse.orderId
                ].product

                console.log(product);

                let challengeStage;

                if (product?.challengeType === "funded") {
                    challengeStage = "funded";
                } else {
                    challengeStage = "phase1";
                }

                const challengeStageData = {
                    ...product,
                    ...product,
                    challengeStages: {
                      ...product.challengeStages,
                      phase1: challengeStage === "funded" ? null : product.challengeStages.phase1,
                      phase2: challengeStage === "funded" || challengeStage === "phase1" && null,
                      funded: challengeStage === "phase1" ? null : product.challengeStages.funded
                    }
                }

				const mt5Data = {
					account: 999232,
					password: "43252@!",
					productId: productId,
					challengeStage: challengeStage,

                    challengeStageData: challengeStageData
						
				};

				const updateMT5Account = await apiRequestHandler(
					`/users/${userResponse._id}`,
					"PUT",
					{
						mt5Accounts: [mt5Data],
					},
				);

				if (!updateMT5Account) {
					toast.error("Failed to update user mt5Account.");
					return;
				}

				// Update the user with the new order ID
				// const updateUser = await apiRequestHandler(
				// 	`/users/${userResponse._id}`,
				// 	"PUT",
				// 	{
				// 		orders: [orderResponse._id],
				// 	},
				// );

				// // Check if user update with order ID was successful
				// if (!updateUser) {
				// 	toast.error("Failed to update user with new order.");
				// 	return;
				// }
			} catch (error) {
				// Log the error and notify user
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
					className="px-10 py-2 bg-blue-600 hover:bg-blue-500 duration-500 rounded-md w-2/4 text-white font-bold"
				>
					{createUser.isPending ? "Processing..." : "Proceed"}
				</button>
			</div>
		</section>
	);
};

export default BillingDetails;
