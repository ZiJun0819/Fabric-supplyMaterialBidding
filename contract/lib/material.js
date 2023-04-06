/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Utility class for ledger state
const State = require('../ledger-api/state.js');

// Enumerate commercial paper state values
const cmState = {
    ISSUED: 1,
    TRADING: 2,
    SIGNED: 3,
};

/**
 * CommercialPaper class extends State class
 * Class will be used by application and smart contract to define a paper
 */
class MaterialContract extends State {
    constructor(obj) {
        super(MaterialContract.getClass(), [obj.issuer, obj.number]);
        Object.assign(this, obj);
    }

    /**
     * Basic getters and setters
     */
    getIssuer() {
        return this.issuer;
    }

    setIssuer(newIssuer) {
        this.issuer = newIssuer;
    }

    getOwner() {
        return this.owner;
    }

    setOwnerMSP(mspid) {
        this.mspid = mspid;
    }

    getOwnerMSP() {
        return this.mspid;
    }

    setOwner(newOwner) {
        this.owner = newOwner;
    }

    /**
     * Useful methods to encapsulate commercial paper states
     */
    setIssued() {
        this.currentState = cmState.ISSUED;
    }

    setTrading() {
        this.currentState = cmState.TRADING;
    }

    setSigned() {
        this.currentState = cmState.SIGNED;
    }

    isIssued() {
        return this.currentState === cmState.ISSUED;
    }

    isTrading() {
        return this.currentState === cmState.TRADING;
    }

    isSigned() {
        return this.currentState === cmState.SIGNED;
    }

    static fromBuffer(buffer) {
        return MaterialContract.deserialize(buffer);
    }

    toBuffer() {
        return Buffer.from(JSON.stringify(this));
    }

    /**
     * Deserialize a state data to commercial paper
     * @param {Buffer} data to form back into the object
     */
    static deserialize(data) {
        return State.deserializeClass(data, MaterialContract);
    }

    /**
     * Factory method to create a material reward-duty contract object
     */
    static createInstance(issuer, materialNumber, matetialType, arrivalTime, rewardValue) {
        return new MaterialContract({
            issuer,
            materialNumber,
            matetialType,
            arrivalTime,
            rewardValue,
        });
    }

    static getClass() {
        return 'org.materialnet.materialcontract';
    }
}

module.exports = MaterialContract;
