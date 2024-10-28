import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { foxFunded25step1 } from "./constants/challengeDatas";
import apiRequestHandler from "./utils/apiRequestHandler";

// TODO: Update with selected plan or challenge data
const planData = foxFunded25step1;

const selectedChallengeName = planData?.challengeName;

// TODO: Update with form data for user registration
// user registration data
const formData = {
	email: "clashking1545@gmail.com",
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
			const userResponse = data;

			if (!userResponse) {
				toast.error("User registration failed.");
				return;
			}

			toast.success("User registered successfully!"); // Success toast for user registration

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
				discountPrice: 0,
				totalPrice: 0,
			};

			try {
				const orderResponse = await apiRequestHandler(
					"/orders/create-order",
					"POST",
					orderData,
				);

				if (!orderResponse) {
					toast.error("Failed to create order.");
					return;
				}

				toast.success("Order created successfully!"); // Success toast for order creation

				const updateUser = await apiRequestHandler(
					`/users/${userResponse._id}`,
					"PUT",
					{
						orders: [orderResponse._id],
					},
				);

				if (!updateUser) {
					toast.error("Failed to update user with new order.");
					return;
				}

				toast.success("User updated with new order successfully!"); // Success toast for user update

				const paymentIsDone = true;

				if (paymentIsDone) {
					const orderStatusUpdate = await apiRequestHandler(
						`/orders/${orderResponse._id}`,
						"PUT",
						{
							orderStatus: "Accepted",
							paymentStatus: "Paid",
						},
					);

					if (
						orderStatusUpdate?.updatedOrder?.paymentStatus !== "Paid" ||
						orderStatusUpdate?.updatedOrder?.orderStatus !== "Accepted"
					) {
						toast.error("Order or payment status update failed.");
						return;
					}

					toast.success("Order and payment status updated successfully!"); // Success toast for status update

					const updateUserPurchaseProducts = await apiRequestHandler(
						`/users/${userResponse._id}/purchased-products`,
						"PUT",
						{
							productId: orderResponse.orderId,
							product: planData,
						},
					);

					if (!updateUserPurchaseProducts) {
						toast.error("Failed to update user purchased products.");
						return;
					}

					toast.success("User purchased products updated successfully!"); // Success toast for purchased products update

					const modifiedEmail = userResponse?.email.toLowerCase();

					const matchTraderSignUpData = {
						email: modifiedEmail,
						password: userResponse.password,
						firstname: userResponse.first,
						lastname: userResponse.last,
						phoneNumber: userResponse.phone || "N/A",
						country: userResponse.country || "N/A",
						city: userResponse.city || "N/A",
						address: userResponse.addr || "N/A",
						postCode: userResponse.zipCode || "N/A",
						offerUuid: "1abefa9d-ed32-4c20-8ac6-a063ec4dd3e0",
						depositAmount: planData.accountSize,
					};

					const createUser = await apiRequestHandler(
						"/users/create-user",
						"POST",
						matchTraderSignUpData,
					);

					console.log("createUser", createUser);

					if (!createUser?.accountDetails?.normalAccount?.uuid) {
						await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
							orderStatus: "Processing",
						});
						toast.error("Failed to create MT5 account.");
						return;
					}

					toast.success("MT5 account created successfully!"); // Success toast for MT5 account creation

					const mt5Data = {
						account: createUser.accountDetails.tradingAccount.login,
						masterPassword: userResponse.password,
						productId:
							updateUserPurchaseProducts.data.purchasedProducts[
								orderResponse.orderId
							].productId,
						challengeStage: "phase1",
						challengeStageData: {
							...planData,
							challengeStages: {
								...planData.challengeStages,
								phase1: planData.challengeStages.phase1,
								phase2: null,
								funded: null,
							},
						},
						group: "propextFOXusd-B1",
						offerUUID: createUser.accountDetails.tradingAccount.offerUuid,
					};

					const updateMT5Account = await apiRequestHandler(
						`/users/${userResponse._id}`,
						"PUT",
						{
							matchTraderAccounts: [mt5Data],
						},
					);

					if (!updateMT5Account) {
						toast.error("Failed to update user MT5 account.");
						return;
					}

					toast.success("MT5 account updated successfully!"); // Success toast for MT5 account update

					const updateOrderStatus = await apiRequestHandler(
						`/orders/${orderResponse._id}`,
						"PUT",
						{
							orderStatus: "Delivered",
						},
					);

					if (!updateOrderStatus) {
						toast.error("Failed to update order status to Delivered.");
						return;
					}

					toast.success("Order status updated to Delivered!"); // Success toast for order status update

					await apiRequestHandler(`/users/${userResponse._id}`, "PUT", {
						role: "trader",
					});

					// Success toast for role update

					toast.success("Payment processed successfully!");
				}
			} catch (error) {
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
			<div className="flex justify-center items-center h-full flex-col space-y-10">
				<h1 className="text-5xl font-bold">{selectedChallengeName || ""}</h1>

				<div className="w-full flex justify-center">
					<button
						onClick={(e) => onSubmit(e)}
						type="submit"
						className="px-10 py-2 bg-blue-600 hover:bg-blue-500 duration-500 rounded-md w-2/4 text-white font-bold"
					>
						{createUser.isPending ? "Processing..." : "Proceed"}
					</button>
				</div>
			</div>
		</section>
	);
};

export default BillingDetails;
