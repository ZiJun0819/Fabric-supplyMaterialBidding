/*
 * Copyright IBM Corp. All Rights Reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

// Utility class for collections of ledger states --  a state list
const StateList = require('../ledger-api/statelist.js');

const MaterialContract = require('./material.js');

class ContractList extends StateList {
    constructor(ctx) {
        super(ctx, 'org.materialnet.materialcontractlist');
        this.use(MaterialContract);
    }

    async addMaterialContract(materialContract) {
        return this.addState(materialContract);
    }

    async getMaterialContract(materialContractKey) {
        return this.getState(materialContractKey);
    }

    async updateMaterialContract(materialContract) {
        return this.updateState(materialContract);
    }
}

module.exports = ContractList;
