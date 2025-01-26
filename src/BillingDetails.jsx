import { useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { foxFunded25step1 } from "./constants/challengeDatas";
import apiRequestHandler from "./utils/apiRequestHandler";
import { generatePassword } from "./utils/generatePassword";

// TODO: Update with selected plan or challenge data
const planData = foxFunded25step1;

const selectedChallengeName = planData?.challengeName;

const challengeStage = "phase1"; // phase1, phase2, funded

let group = "VB\\demo.IB_2501_02";

const BillingDetails = () => {
	const createUser = useMutation({
		mutationFn: (data) => apiRequestHandler("/users/normal-register", "POST", data),

		onSuccess: async (data, variables) => {
			const userResponse = data;

			if (!userResponse) {
				toast.error("User registration failed.");
				return;
			}

			// Prepare order data with user and plan details
			const orderData = {
				orderItems: [variables.challengeData],
				paymentMethod: "N/A",
				buyerDetails: {
					email: userResponse.email,
					first: userResponse.first,
					last: userResponse.last,
					userId: userResponse._id,
					password: userResponse.password,
				},
				group: group,
				subtotal: variables?.challengeData?.challengePrice,
				discountPrice: variables?.challengeData?.discountPrice || 0,
				totalPrice: variables?.challengeData?.challengePrice,
				referralCode: "",
				isGiveAway: false,
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

				// Update user purchase products after order is placed
				const updateUserPurchaseProducts = await apiRequestHandler(
					`/users/${userResponse._id}/purchased-products`,
					"PUT",
					{
						productId: orderResponse.orderId,
						product: variables?.challengeData, // TODO: Update with actual challenge data
					}
				);

				// Check if updating user purchase products was successful
				if (!updateUserPurchaseProducts) {
					toast.error("Failed to update user purchased products.");
					return;
				}

				// Create MT5 account

				const sanitizedChallengeName = planData.challengeName.replace(
					/\s*\((Phase-1|Phase-2|Funded)\)/i,
					""
				);

				const mt5SignUpData = {
					EMail: data?.email,
					master_pass: generatePassword(),
					investor_pass: generatePassword(),
					amount: variables?.challengeData?.accountSize,
					FirstName: `Foxx Funded ${sanitizedChallengeName} (${challengeStage})  ${variables?.first} ${variables?.last}`,
					LastName: variables?.last,
					Leverage: 30,
					Group: group,
				};

				const createUser = await apiRequestHandler("/users/create-user", "POST", mt5SignUpData);

				// Check if MT5 account creation was successful
				if (!createUser?.login) {
					await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
						orderStatus: "Processing", // Set to Processing if MT5 account creation fails
					});
					toast.error("Failed to create MT5 account.");
					return;
				}

				if (createUser) {
					const productId =
						updateUserPurchaseProducts.data.purchasedProducts[orderResponse.orderId].productId;

					const product =
						updateUserPurchaseProducts.data.purchasedProducts[orderResponse.orderId].product;

					// Prepare challenge stage data for injecting MT5 account in user's collection
					const challengeStageData = {
						...product,
						challengeName: sanitizedChallengeName,
						challengeStages: {
							phase1:
								challengeStage === "phase1"
									? variables?.challengeData?.challengeStages?.phase1
									: null,
							phase2:
								challengeStage === "phase2"
									? variables?.challengeData?.challengeStages?.phase2
									: null,
							funded:
								challengeStage === "phase1" || challengeStage === "phase2"
									? null
									: variables?.challengeData?.challengeStages?.funded,
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
						role: "trader",
					});

					// Check if MT5 account update was successful
					if (!updateMT5Account) {
						toast.error("Failed to update user MT5 account.");
						return;
					}

					// Update the order status to Delivered
					const updateOrderStatus = await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
						orderStatus: "Delivered",
						paymentStatus: "Paid",
					});

					// Check if order status update to Delivered was successful
					if (!updateOrderStatus) {
						toast.error("Failed to update order status to Delivered.");
						return;
					}

					// Notify user of successful payment processing
					toast.success("Mt5 Account Assign Successful!");
				}
			} catch (error) {
				// Log the error and notify user
				console.error("🚀 ~ onSuccess error:", error);
				toast.error("An error occurred during the process: " + error.message);
			}
		},
	});

	const onSubmit = async (event) => {
		event.preventDefault();

		const infos = {
			email: "clashking1545@gmail.com",
			first: "Sajid",
			last: "Abd",
			country: "BD",
			addr: "CTG",
			city: "CTG",
			zipCode: "15314",
			phone: "62525245252",
			challengeData: planData,
		};

		await createUser.mutateAsync(infos);
	};

	return (
		<section className="max-w-[1440px] mx-auto h-screen">
			<div className="flex justify-center items-center h-full flex-col space-y-10">
				<h1 className="text-5xl font-bold">{selectedChallengeName || ""}</h1>

				<div className="w-full flex justify-center">
					<button
						onClick={(e) => onSubmit(e)}
						type="submit"
						className="px-10 py-2 bg-blue-600 hover:bg-blue-500 duration-500 rounded-md w-2/4 text-white font-bold">
						{createUser.isPending ? "Processing..." : "Proceed"}
					</button>
				</div>
			</div>
		</section>
	);
};

export default BillingDetails;
