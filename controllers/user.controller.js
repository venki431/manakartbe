import userService from "../services/user.service.js";

export const getMyProfile = async (req, res, next) => {
    try {
        const user = await userService.getMyProfile(req.user.userId);
        res.status(200).json(user);
    } catch (error) {
        next(error);
    }
};

export const getMyAddresses = async (req, res, next) => {
    try {
        const addresses = await userService.getMyAddresses(req.user.userId);
        res.status(200).json(addresses);
    } catch (error) {
        next(error);
    }
};

export const createAddress = async (req, res, next) => {
    try {
        const address = await userService.createAddress(req.user.userId, req.body);
        res.status(201).json(address);
    } catch (error) {
        next(error);
    }
};

export const updateAddress = async (req, res, next) => {
    try {
        const address = await userService.updateAddress(
            req.user.userId,
            req.params.id,
            req.body
        );
        res.status(200).json(address);
    } catch (error) {
        next(error);
    }
};

export const deleteAddress = async (req, res, next) => {
    try {
        await userService.deleteAddress(req.user.userId, req.params.id);
        res.status(204).send();
    } catch (error) {
        next(error);
    }
};