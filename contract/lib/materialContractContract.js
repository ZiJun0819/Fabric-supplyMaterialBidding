/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Fabric smart contract classes
const { Contract, Context } = require('fabric-contract-api');

// materialNet specifc classes
const MaterialContract = require('./material.js');
const MaterialContractList = require('./materialContractlist.js');
const QueryUtils = require('./queries.js');

/**
 * A custom context provides easy access to list of all commercial materials
 */
class MaterialContractContext extends Context {
    constructor() {
        super();
        // All materials are held in a list of materials
        this.materialContractList = new MaterialContractList(this);
    }
}

/**
 * Define commercial material smart contract by extending Fabric Contract class
 *
 */
class MaterialContractContract extends Contract {
    constructor() {
        // Unique namespace when multiple contracts per chaincode file
        super('org.materialnet.materialcontract');
    }

    /**
     * Define a custom context for commercial material
     */
    createContext() {
        return new MaterialContractContext();
    }

    /**
     * Instantiate to perform any setup of the ledger that might be required.
     * @param {Context} ctx the transaction context
     */
    async instantiate(ctx) {
        // No implementation required with this example
        // It could be where data migration is performed, if necessary
        console.log('Instantiate the contract');
    }

    /**
     *
     * @param {Context} ctx
     * @param {String} issuer
     * @param {Integer} materialNumber
     * @param {String} matetialType
     * @param {String} arrivalTime
     * @param {Integer} rewardValue
     * @returns
     */
    async issue(ctx, issuer, materialNumber, matetialType, arrivalTime, rewardValue) {
        // create an instance of the material
        let materialContract = MaterialContract.createInstance(
            issuer,
            materialNumber,
            matetialType,
            arrivalTime,
            parseInt(rewardValue)
        );

        // Smart contract, rather than material, moves material into ISSUED state
        materialContract.setIssued();

        // save the owner's MSP
        let mspid = ctx.clientIdentity.getMSPID();
        materialContract.setOwnerMSP(mspid);

        // Newly issued material is owned by the issuer to begin with (recorded for reporting purposes)
        materialContract.setOwner(issuer);

        // Add the material to the list of all similar commercial materials in the ledger world state
        await ctx.materialContractList.addMaterialContract(materialContract);

        // Must return a serialized material to caller of smart contract
        return materialContract.toBuffer();
    }

    async selectContract(ctx, issuer, materialNumber, currentOwner, newOwner) {
        // Retrieve the current material using key fields provided
        let materialKey = MaterialContract.makeKey([issuer, materialNumber]);
        let materialContract = await ctx.materialContractList.getMaterialContract(materialKey);

        // Validate current owner
        if (materialContract.getOwner() !== currentOwner) {
            throw new Error(
                '\nmaterial ' + issuer + materialNumber + ' is not owned by ' + currentOwner
            );
        }

        // First buy moves state from ISSUED to TRADING (when running )
        if (materialContract.isIssued()) {
            materialContract.setTrading();
        }

        // Check material is not already REDEEMED
        if (materialContract.isTrading()) {
            materialContract.setOwner(newOwner);
            // save the owner's MSP
            let mspid = ctx.clientIdentity.getMSPID();
            materialContract.setOwnerMSP(mspid);
        } else {
            throw new Error(
                '\nmaterial ' +
                    issuer +
                    materialNumber +
                    ' is not trading. Current state = ' +
                    materialContract.getCurrentState()
            );
        }

        // Update the material
        await ctx.materialContractList.updateMaterialContract(materialContract);
        return materialContract;
    }

    async signContract(ctx, issuer, materialNumber, signingOwner, issuingOwnerMSP) {
        let materialKey = MaterialContract.makeKey([issuer, materialNumber]);

        let materialContract = await ctx.materialContractList.getmaterial(materialKey);

        // Check material is not alread in a state of REDEEMED
        if (materialContract.isSigned()) {
            throw new Error(
                '\nmaterialContract ' + issuer + materialNumber + ' has already been signed'
            );
        }

        // Validate current redeemer's MSP matches the invoking redeemer's MSP id - can only redeem if you are the owning org.

        if (materialContract.getOwnerMSP() !== ctx.clientIdentity.getMSPID()) {
            throw new Error(
                '\nmaterialContract ' +
                    issuer +
                    materialNumber +
                    ' cannot be signed by ' +
                    ctx.clientIdentity.getMSPID() +
                    ', as it is not the authorised owning Organisation'
            );
        }

        // As this is just a sample, can show additional verification check: that the redeemer provided matches that on record, before redeeming it
        if (materialContract.isTrading() && materialContract.getIssuer() === signingOwner) {
            materialContract.setOwner(materialContract.getIssuer());
            materialContract.setOwnerMSP(issuingOwnerMSP);
            materialContract.setSigned();
        } else {
            throw new Error(
                '\nSigning owner: ' +
                    signingOwner +
                    ' organisation does not currently own materialContract: ' +
                    issuer +
                    materialNumber
            );
        }

        await ctx.materialContractList.updatematerial(materialContract);
        return materialContract;
    }

    // Query transactions

    /**
     * Query history of a commercial material
     * @param {Context} ctx the transaction context
     * @param {String} issuer commercial material issuer
     * @param {Integer} materialNumber material number for this issuer
     */
    async queryHistory(ctx, issuer, materialNumber) {
        // Get a key to be used for History query

        let query = new QueryUtils(ctx, 'org.materialnet.material');
        let results = await query.getAssetHistory(issuer, materialNumber); // (cpKey);
        return results;
    }

    /**
     * queryOwner commercial material: supply name of owning org, to find list of materials based on owner field
     * @param {Context} ctx the transaction context
     * @param {String} owner commercial material owner
     */
    async queryOwner(ctx, owner) {
        let query = new QueryUtils(ctx, 'org.materialnet.material');
        let owner_results = await query.queryKeyByOwner(owner);

        return owner_results;
    }

    /**
     * queryPartial commercial material - provide a prefix eg. "DigiBank" will list all materials _issued_ by DigiBank etc etc
     * @param {Context} ctx the transaction context
     * @param {String} prefix asset class prefix (added to materiallist namespace) eg. org.materialnet.materialMagnetoCorp asset listing: materials issued by MagnetoCorp.
     */
    async queryPartial(ctx, prefix) {
        let query = new QueryUtils(ctx, 'org.materialnet.material');
        let partial_results = await query.queryKeyByPartial(prefix);

        return partial_results;
    }

    /**
     * queryAdHoc commercial material - supply a custom mango query
     * eg - as supplied as a param:
     * ex1:  ["{\"selector\":{\"faceValue\":{\"$lt\":8000000}}}"]
     * ex2:  ["{\"selector\":{\"faceValue\":{\"$gt\":4999999}}}"]
     *
     * @param {Context} ctx the transaction context
     * @param {String} queryString querystring
     */
    async queryAdhoc(ctx, queryString) {
        let query = new QueryUtils(ctx, 'org.materialnet.material');
        let querySelector = JSON.parse(queryString);
        let adhoc_results = await query.queryByAdhoc(querySelector);

        return adhoc_results;
    }

    /**
     * queryNamed - supply named query - 'case' statement chooses selector to build (pre-canned for demo purposes)
     * @param {Context} ctx the transaction context
     * @param {String} queryname the 'named' query (built here) - or - the adHoc query string, provided as a parameter
     */
    async queryNamed(ctx, queryname) {
        let querySelector = {};
        switch (queryname) {
            case 'redeemed':
                querySelector = { selector: { currentState: 4 } }; // 4 = redeemd state
                break;
            case 'trading':
                querySelector = { selector: { currentState: 3 } }; // 3 = trading state
                break;
            case 'value':
                // may change to provide as a param - fixed value for now in this sample
                querySelector = { selector: { faceValue: { $gt: 4000000 } } }; // to test, issue Commmaterials with faceValue <= or => this figure.
                break;
            default: // else, unknown named query
                throw new Error(
                    'invalid named query supplied: ' + queryname + '- please try again '
                );
        }

        let query = new QueryUtils(ctx, 'org.materialnet.material');
        let adhoc_results = await query.queryByAdhoc(querySelector);

        return adhoc_results;
    }
}

module.exports = MaterialContractContract;
