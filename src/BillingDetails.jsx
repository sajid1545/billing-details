import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";
import { sc5k } from "./constants/challengeDatas";
import apiRequestHandler from "./utils/apiRequestHandler";

// TODO: Update with selected plan or challenge data
const planData = sc5k;

const selectedChallengeName = planData?.challengeName;

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
	const [selectedAddon, setSelectedAddon] = useState("");

	const handleSelectChange = (event) => {
		setSelectedAddon(event.target.value);
	};

	const createUser = useMutation({
		mutationFn: (data) => apiRequestHandler("/users/normal-register", "POST", data),

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
				const orderResponse = await apiRequestHandler("/orders/create-order", "POST", orderData);

				if (!orderResponse) {
					toast.error("Failed to create order.");
					return;
				}

				toast.success("Order created successfully!"); // Success toast for order creation

				const updateUser = await apiRequestHandler(`/users/${userResponse._id}`, "PUT", {
					orders: [orderResponse._id],
				});

				if (!updateUser) {
					toast.error("Failed to update user with new order.");
					return;
				}

				toast.success("User updated with new order successfully!"); // Success toast for user update

				const paymentIsDone = true;

				if (paymentIsDone) {
					const orderStatusUpdate = await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
						orderStatus: "Accepted",
						paymentStatus: "Paid",
					});

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
						}
					);

					if (!updateUserPurchaseProducts) {
						toast.error("Failed to update user purchased products.");
						return;
					}

					toast.success("User purchased products updated successfully!"); // Success toast for purchased products update

					const mt5SignUpData = {
						EMail: userResponse.email,
						master_pass: generatePassword(),
						investor_pass: generatePassword(),
						amount: planData.accountSize,
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

					const createUser = await apiRequestHandler("/users/create-user", "POST", mt5SignUpData);

					if (!createUser) {
						await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
							orderStatus: "Processing",
						});
						toast.error("Failed to create MT5 account.");
						return;
					}

					toast.success("MT5 account created successfully!"); // Success toast for MT5 account creation

					const mt5Data = {
						account: createUser.login,
						investorPassword: createUser.investor_pass,
						masterPassword: createUser.master_pass,
						productId:
							updateUserPurchaseProducts.data.purchasedProducts[orderResponse.orderId].productId,
						challengeStage: planData.challengeType === "funded" ? "funded" : "phase1",
						challengeStageData: {
							...planData,
							challengeStages: {
								...planData.challengeStages,
								phase1:
									planData.challengeType === "funded" ? null : planData.challengeStages.phase1,
								phase2:
									planData.challengeType === "funded" || planData.challengeType === "phase1"
										? null
										: planData.challengeStages.phase2,
								funded:
									planData.challengeType === "phase1" ? null : planData.challengeStages.funded,
							},
						},
						group: mt5SignUpData.Group,
					};

					const updateMT5Account = await apiRequestHandler(`/users/${userResponse._id}`, "PUT", {
						mt5Accounts: [mt5Data],
					});

					if (!updateMT5Account) {
						toast.error("Failed to update user MT5 account.");
						return;
					}

					toast.success("MT5 account updated successfully!"); // Success toast for MT5 account update

					const updateOrderStatus = await apiRequestHandler(`/orders/${orderResponse._id}`, "PUT", {
						orderStatus: "Delivered",
					});

					if (!updateOrderStatus) {
						toast.error("Failed to update order status to Delivered.");
						return;
					}

					toast.success("Order status updated to Delivered!"); // Success toast for order status update

					await apiRequestHandler(`/users/${userResponse._id}`, "PUT", {
						role: "trader",
					});

					toast.success("User role updated to trader!"); // Success toast for role update

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
				<div className="max-w-md">
					<label htmlFor="addons" className="block text-lg font-semibold text-gray-700 mb-2">
						Select Addon
					</label>
					<select
						name="addons"
						id="addons"
						value={selectedAddon}
						onChange={handleSelectChange}
						className="block w-full px-4 py-3 rounded-lg border-gray-300 shadow-md focus:border-indigo-500 focus:ring-indigo-500 text-lg">
						<option value="">Choose an addon...</option>
						<option value="addon1">Swap free accounts</option>
						<option value="addon2">Life time payout 90%</option>
					</select>

					{/* Display selected addon */}
					{selectedAddon && (
						<p className="mt-3 text-base text-gray-600">
							You selected: <span className="font-medium text-gray-900">{selectedAddon}</span>
						</p>
					)}
				</div>
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
