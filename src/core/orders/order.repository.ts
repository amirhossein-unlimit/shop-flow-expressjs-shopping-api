import APIFeatures from "../../utils/apiFeatures";
import { CreateOrderDto } from "./dtos/create-order.dto";
import { UpdateOrderDto } from "./dtos/update-order.dto";
import { OrderDoc, OrderModel } from "./order.interface";

export class OrderRepository {
	constructor(private readonly orderModel: OrderModel) {}

	/* ********************************************************
	 ****************** QUERIES OPERATIONS ********************
	 ******************************************************** */

	async findAll(
		query: any,
		initialFilter?: any,
		populate?: string
	): Promise<{
		pagination: any;
		skip: number;
		total: number;
		orders: OrderDoc[];
	}> {
		const features = new APIFeatures(
			this.orderModel as any,
			query,
			initialFilter,
			populate
		);
		const { pagination, skip, total } = await features
			.filter()
			.search()
			.sort()
			.limitFields()
			.pagination();

		const orders = await features.dbQuery;

		return {
			pagination,
			skip,
			total,
			orders,
		};
	}

	async findAllTops(limit: number): Promise<OrderDoc[]> {
		return this.orderModel.aggregate([
			{
				$unwind: "$orderItems",
			},
			{
				$group: {
					_id: "$orderItems.product",
					totalSold: { $sum: "$orderItems.qty" },
				},
			},
			{
				$sort: { totalSold: -1 },
			},
			{
				$limit: limit,
			},
			{
				$lookup: {
					from: "products",
					localField: "_id",
					foreignField: "_id",
					as: "product",
				},
			},
			{
				$project: {
					_id: 0,
				},
			},
		]);
	}

	async findById(orderId: string, populate?: string): Promise<OrderDoc | null> {
		return this.orderModel.findById(orderId).populate(populate || "");
	}

	/* ********************************************************
	 ****************** MUTATIONS OPERATIONS ******************
	 ******************************************************** */

	// orderRepository.ts
	async create(
			payload: CreateOrderDto, 
			userId: string, 
			populate?: string | any
	): Promise<OrderDoc> {
			if (!payload.orderItems || !Array.isArray(payload.orderItems)) {
					throw new Error("orderItems is required and must be an array");
			}

			const newOrder = await this.orderModel.create({
					...payload,
					user: userId,
					orderItems: payload.orderItems.map((item) => ({
							product: item.productId,
							qty: item.qty,
					})),
			});

			if (populate) {
					return newOrder.populate(populate);
			}
			
			return newOrder; 
	}

	async updateById(
			orderId: string,
			payload: UpdateOrderDto,
			populate?: string
	): Promise<OrderDoc | null> {
			let query = this.orderModel.findByIdAndUpdate(orderId, payload, {
					new: true,
			});

			if (populate) {
					return query.populate(populate).exec();
			}

			return query.exec();
	}

	async deleteById(
			orderId: string, 
			populate?: string | any
	): Promise<OrderDoc | null> {
			let query = this.orderModel.findByIdAndDelete(orderId);

			if (populate) {
					return query.populate(populate).exec();
			}

			return query.exec();
	}
}
