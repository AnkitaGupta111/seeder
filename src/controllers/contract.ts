import { Request, Response } from "express";
import Contract from "../models/contract";
import User from "../models/user";
import { UserRole } from "../utils/enums";
import catchAsync from "../utils/catchAsync";
import ApiError from "../utils/ApiError";
import httpStatus from 'http-status-codes';
import { getSortAndPagination } from "../utils/util";
import { plainToClass } from "class-transformer";
import { ContractDTO } from "../dtos/ContractDTO";
import { RecipientContractDTO } from "../dtos/RecipientContractDTO";


const addNewContract = catchAsync((req: Request, res: Response) => {
  const { name, termLength, type, termRate, totalAmount, totalFinanced, perPayment } = req.body

  //@ts-ignore
  const contractOwner = req.user

  const contract = new Contract({
    name,
    termLength,
    type,
    termRate,
    totalAmount,
    totalFinanced,
    perPayment,
    contractOwner
  })
  return contract.save()
    .then((contract) => {
      res.status(201).json(plainToClass(ContractDTO, contract.toObject(), {
        excludeExtraneousValues: true
      }));
      return contract
    }).then((newContract) => {
      contractOwner.contracts.PROVIDER.push(newContract)
      contractOwner.save();
      return User.updateMany({ role: UserRole.RECIPIENT },
        {
          $addToSet: {
            [`contracts.${UserRole.RECIPIENT}`]: { contractDetail: newContract._id }
          }
        }, { multi: true })
    })
})

const getUserContracts = catchAsync((req: Request, res: Response) => {
  const status = req.query.status
  const cashkick = req.query.cashkick

  //@ts-ignore
  const loggedInUser = req.user

  if (loggedInUser.role === UserRole.PROVIDER) {
    const contracts = plainToClass(ContractDTO, loggedInUser.contracts?.PROVIDER, {
      excludeExtraneousValues: true
    })
    res
      .status(200)
      .json(contracts)
  } else {
    const filteredContracts = loggedInUser.contracts?.[UserRole.RECIPIENT].filter((contract: any) => {
      let result = true;
      if (status) {
        result = contract.status === status
      }
      if (cashkick) {
        result = result && contract.cashkick.toString() === cashkick.toString()
      }
      return result
    })

    return User.populate(filteredContracts, {
      path: 'contractDetail',
    }).
      then((contracts: any) => {
        const contractdTOS = plainToClass(RecipientContractDTO, contracts, {
          excludeExtraneousValues: true
        })

        res
          .status(200)
          .json(contractdTOS)
      })
  }
})

const getContractDetail = catchAsync((req: Request, res: Response) => {
  const contractId = req.params.id
  const includeRef = (req.query.includes as string)?.split(",") || []
  includeRef.push("contractDetail")

  const pathsToInclude = includeRef?.map((field) => ({ path: field })) || []

  //@ts-ignore
  const loggedInUser = req.user

  const filteredContract = loggedInUser.contracts?.[loggedInUser.role].find((contract: any) => contract.contractDetail == contractId)

  if (!filteredContract) {
    return Promise.reject(new ApiError(httpStatus.NOT_FOUND, "contract id not found"))
  }

  return User.populate(filteredContract, pathsToInclude).then((contract) => {
    const contractdTO = plainToClass(RecipientContractDTO, contract, {
      excludeExtraneousValues: true
    });
    res.status(200).json(contractdTO)
  })
})


export default { addNewContract, getContractDetail, getUserContracts }