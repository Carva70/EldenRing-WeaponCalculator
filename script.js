
import * as attackJson from './database/attack.json' assert { type: 'json' };
import * as scalingJson from './database/scaling.json' assert { type: 'json' };
import * as correctGraphId from './database/correctGraphId.json' assert { type: 'json' };
import * as correctGraph from './database/correctGraph.json' assert { type: 'json' };
import * as attackParam from './database/attackElementCorrectParam.json' assert { type: 'json' };
import * as passive from './database/passive.json' assert { type: 'json'}
import * as extraData from './database/extraData.json' assert { type: 'json'}

function getWeaponAttack(name) {
    return attackJson.default.filter(
        function(attackJson){ return attackJson.Name == name }
    );
}

function getWeaponScale(name) {
    return scalingJson.default.filter(
        function(scalingJson){ return scalingJson.Name == name }
    );
}

function getCorrectGraphId(name) {
    return correctGraphId.default.filter(
        function(correctGraphId){ return correctGraphId.Name == name }
    )[0];
}

function getCorrectGraph(id) {
    return correctGraph.default.filter(
        function(correctGraph){ return correctGraph.ID == id }
    )[0];
}

function getAttackParam(id) {
    return attackParam.default.filter(
        function(attackParam){ return attackParam["Row ID"] == id }
    )[0];
}

function getPassive(name) {
    return passive.default.filter(
        function(passive){ return passive.Name == name }
    )[0];
}

function getMaxUpgrade(name) {
    return extraData.default.filter(
        function(extraData){ return extraData.Name == name }
    )[0]["Max Upgrade"];
}

function getExtraData(name) {
    return extraData.default.filter(
        function(extraData){ return extraData.Name == name }
    )[0];
}

function getRequirements(name) {
    var exData = getExtraData(name)
    var sclList = ["Str", "Dex", "Int", "Fai", "Arc"]
    var reqDict = {}

    for (var i = 0; i < sclList.length; i++) {
        var reqNumber = exData["Required (" + sclList[i] + ")"]
        if (reqNumber != 0) reqDict[sclList[i]] = reqNumber
    }

    return reqDict
}

function CalcCorrectFormula(input, StatMin, StatMax, ExponentMin, GrowMin, GrowMax) {
    var ratio = (input - StatMin) / (StatMax - StatMin)

    var growth = 0

    if (ExponentMin > 0) {
        growth = ratio ** ExponentMin
    } else if (ExponentMin < 0) {
        growth = 1 - ((1 - ratio) ** (Math.abs(ExponentMin)))
    }

    return (GrowMin + ((GrowMax - GrowMin) * growth))
}


function getStatFromPlayer(playerStats, weaponName, weaponLevel) {
    var cGraphId = getCorrectGraphId(weaponName)
    var AttackElementCorrectID = cGraphId["AttackElementCorrect ID"]

    var attParam = getAttackParam(AttackElementCorrectID)

    var listScale = ["STR", "DEX", "INT", "FAI", "ARC"]
    var listDamage = ["Physical", "Magic", "Fire", "Lightning", "Holy"]
    

    var calcCorrectDict = {}

    for (var i = 0; i < 5; i++) {
        var cGraph = getCorrectGraph(cGraphId[listDamage[i]])

        calcCorrectDict[listDamage[i]] = {}

        for (var j = 0; j < 5; j++) {
            if (attParam[listDamage[i] + " Scaling: " + listScale[j]] == 0) {
                calcCorrectDict[listDamage[i]][listScale[j]] = 0      
                continue
            }
            
            var StatMin = cGraph["Stat 0"]
            var StatMax = cGraph["Stat 4"]
            var ExponentMin = cGraph["Exponent 0"]
            var GrowMin = cGraph["Grow 0"]
            var GrowMax = cGraph["Grow 4"]

            for (var k = 0; k < 5; k ++) {
                if (cGraph["Stat " + k] < playerStats[j]) {
                    StatMin = cGraph["Stat " + k]
                    ExponentMin = cGraph["Exponent " + k]
                    GrowMin = cGraph["Grow " + k]
                } 
                if (cGraph["Stat " + (5 - k)] >= playerStats[j]){
                    GrowMax = cGraph["Grow " + (5 - k)]
                    StatMax = cGraph["Stat " + (5 - k)]
                } 
            }

            var calcCorrect = CalcCorrectFormula(playerStats[j], StatMin, StatMax, ExponentMin, GrowMin, GrowMax)
            calcCorrectDict[listDamage[i]][listScale[j]] = calcCorrect / 100
        }
    }

    var wAttack = getWeaponAttack(weaponName)
    var aList = ["Phys", "Mag", "Fire", "Ligh", "Holy"]
    var wScaling = getWeaponScale(weaponName)
    var sList = ["Str", "Dex", "Int", "Fai", "Arc"]

    var baseDamageDict = {}
    var baseScaling = {}

    for (i = 0; i < 5; i++) baseDamageDict[aList[i]] = wAttack[0][aList[i] + " +" + weaponLevel]
    for (i = 0; i < 5; i++) baseScaling[sList[i]] = wScaling[0][sList[i] + " +" + weaponLevel]

    var scaleDamage = {}
    for (i = 0; i < 5; i++) {
        scaleDamage[aList[i]] = {}
        for (j = 0; j < 5; j++) {
            scaleDamage[aList[i]][sList[j]] = baseDamageDict[aList[i]] * baseScaling[sList[j]] * calcCorrectDict[listDamage[i]][listScale[j]]
        }
    }

    var finalDamageOutput = {}
    for (i = 0; i < 5; i++) {
        var sc = scaleDamage[aList[i]]
        finalDamageOutput[aList[i]] = baseDamageDict[aList[i]] + sc["Str"] + sc["Dex"] + sc["Int"] + sc["Fai"] + sc["Arc"]
    }

    var total = 0
    for (i = 0; i < 5; i++) {
        total += finalDamageOutput[aList[i]]
    }

    return [baseDamageDict, scaleDamage, finalDamageOutput, total]

}

function getHp(vigor) {
    if (vigor > 60) {
        return Math.trunc(1900 + 200 * (1 - Math.pow((1 - (vigor - 60) / 39), 1.2)));
    } else if (vigor > 40) {
        return Math.trunc(1450 + 450 * (1 - Math.pow((1 - (vigor - 40) / 20), 1.2)));
    } else if (vigor > 25) {
        return Math.trunc(800 + 650 * Math.pow((vigor - 25) / 15, 1.1));
    } else {
        return Math.trunc(300 + 500 * Math.pow((vigor - 1) / 24, 1.5));
    }
}

function getFp(mind) {
    if (mind > 60) {
        return Math.trunc(350 + 100 * (mind - 60) / 39);
    } else if (mind > 35) {
        return Math.trunc(200 + 150 * (1 - Math.pow((1 - (mind - 35) / 25), 1.2)));
    } else if (mind > 15) {
        return Math.trunc(95 + 105 * (mind - 15) / 20);
    } else {
        return Math.trunc(50 + 45 * (mind - 1) / 14);
    }
}

function getStamina(endurance) {
    if (endurance > 50) {
        return Math.trunc(155 + 15 * (endurance - 50) / 49);
    } else if (endurance > 30) {
        return Math.trunc(130 + 25 * (endurance - 30) / 20);
    } else if (endurance > 15) {
        return Math.trunc(105 + 25 * (endurance - 15) / 15);
    } else {
        return Math.trunc(80 + 25 * (endurance - 1) / 14);
    }
}

function getEquipLoad(endurance) {
    if (endurance > 60) {
        return 120 + (40 * (endurance - 60) / 39);
    } else if (endurance > 25) {
        return 72 + (48 * Math.pow((endurance - 25) / 35, 1.1));
    } else {
        return 45 + (27 * (endurance - 8) / 17);
    }
}

function showWeapons() {

    const select = document.getElementById('weapons-dropdown-brow');
    for (var i in attackJson.default) {
        var option = document.createElement('option')
        option.text = attackJson.default[i].Name
        select.appendChild(option)
    }


}

function statSelection() {
    const statSelectionDiv = document.querySelector('.statSelection');
  
    const stats = [
        { name: 'Vigor', id: 'vigor' },
        { name: 'Mind', id: 'mind' },
        { name: 'Endurance', id: 'endurance' },
        { name: 'Strength', id: 'strength' },
        { name: 'Dexterity', id: 'dexterity' },
        { name: 'Intelligence', id: 'intelligence' },
        { name: 'Faith', id: 'faith' },
        { name: 'Arcane', id: 'arcane' }
    ];
  
    stats.forEach(stat => {
        const statDiv = document.createElement('div');
        const label = document.createElement('label');
        label.innerHTML = stat.name;
        const select = document.createElement('select');
        select.id = stat.id;
    
        for (let i = 5; i <= 99; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.text = i;
            if (i === 10) {
                option.selected = true;
            }
            select.appendChild(option);
        }
  
        statDiv.appendChild(label);
        statDiv.appendChild(select);
        statSelectionDiv.appendChild(statDiv);
    });
}

function showUpgrade() {
    const select = document.getElementById('upgrade-selection');

    for (let i = 0; i <= 25; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = "+" + i;
        select.appendChild(option);
    }
}

function showStartingClass() {

    fetch('https://eldenring.fanapis.com/api/classes')
    .then(response => response.json())
    .then(classes => {
        const startingClassSelect = document.createElement('select');
        startingClassSelect.id = 'starting-class';
        var startingClassOptions = classes.data.map(option => ({
            name: option.name,
            stats: option.stats
        }));

        const defaultOption = document.createElement('option');
        defaultOption.value = '';
        defaultOption.text = 'Starting Class';
        startingClassSelect.prepend(defaultOption);
        

        startingClassOptions.forEach(option => {
            const startingClassOption = document.createElement('option');
            startingClassOption.value = option.name;
            startingClassOption.text = option.name;
            startingClassSelect.appendChild(startingClassOption);
        });

        startingClassSelect.addEventListener('change', event => {
            const selectedStartingClass = startingClassOptions.find(option => option.name === event.target.value);

            if (selectedStartingClass) {
                Object.entries(selectedStartingClass.stats).forEach(([stat, value]) => {
                    if (stat != "level") {
                        const statSelect = document.querySelector(`#${stat}`);
                        statSelect.value = value;
                    }
                });
            }
        });

        const statSelectionDiv = document.querySelector('.statSelection');
        statSelectionDiv.prepend(startingClassSelect);

    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function getLetterFromScaling(num) {
    num = parseFloat(num)
    switch(true) {
        case num > 1.75: return "S(" + parseInt(num * 100) + ")";
        case num >= 1.4: return "A(" + parseInt(num * 100) + ")";
        case num >= 0.9: return "B(" + parseInt(num * 100) + ")";
        case num >= 0.6: return "C(" + parseInt(num * 100) + ")";
        case num >= 0.25: return "D(" + parseInt(num * 100) + ")";
        case num == 0: return "-";
        default: return "E(" + parseInt(num * 100) + ")";
    }
}

function calculateButton() {
    const weaponsDropdown = document.getElementById("weapons-dropdown");
    const calculateButton = document.getElementById("calculate-button");

    calculateButton.addEventListener("click", function() {
        const selectedWeaponName = weaponsDropdown.value
        const weaponAttributes = getWeaponAttack(selectedWeaponName);
        const tableBody = document.getElementById("attack");

        var maxUpgrade = getMaxUpgrade(selectedWeaponName)

        tableBody.innerHTML = "Attack";
        var attList = ["Phys", "Mag", "Fire", "Ligh", "Holy", "Stam"]

        var titleRow = document.createElement("tr");
        titleRow.classList.add("titleRow")
        titleRow.appendChild(document.createElement("td"));
        for (var i = 0; i <= maxUpgrade; i++) {
            var titleName = document.createElement("td")
            titleName.innerHTML = "+" + i
            titleRow.appendChild(titleName);
        }
        tableBody.appendChild(titleRow);
        
        for (var i = 0; i < attList.length; i++) {
            var tableRow = document.createElement("tr");
            var attributeName = document.createElement("td");
            attributeName.classList.add("titleRow")
            attributeName.innerHTML = attList[i];
            tableRow.appendChild(attributeName);
            for (var j = 0; j <= maxUpgrade; j++) {
                var nameCol = attList[i] + " +" + j;
                var attributeValue = document.createElement("td");
                var damage = weaponAttributes[0][nameCol]
                attributeValue.innerHTML = (damage == 0 ? "-" : parseInt(damage))
                tableRow.appendChild(attributeValue);
            }
            tableBody.appendChild(tableRow);
        }

        var weaponScaling = getWeaponScale(selectedWeaponName)

        var sclList = ["Str", "Dex", "Int", "Fai", "Arc"]
        const tableBodyScale = document.getElementById("scalesWith");
        tableBodyScale.innerHTML = "Scaling";


        titleRow = document.createElement("tr");
        titleRow.classList.add("titleRow")
        titleRow.appendChild(document.createElement("td"));
        for (var i = 0; i <= maxUpgrade; i++) {
            var titleName = document.createElement("td")
            titleName.innerHTML = "+" + i
            titleRow.appendChild(titleName);
        }
        tableBodyScale.appendChild(titleRow);
        
        for (var i = 0; i < sclList.length; i++) {
            var tableRow = document.createElement("tr");
            var attributeName = document.createElement("td");
            attributeName.classList.add("titleRow")
            attributeName.innerHTML = sclList[i];
            tableRow.appendChild(attributeName);
            for (var j = 0; j <= maxUpgrade; j++) {
                var nameCol = sclList[i] + " +" + j;
                var attributeValue = document.createElement("td");
                attributeValue.innerHTML = getLetterFromScaling(weaponScaling[0][nameCol])
                tableRow.appendChild(attributeValue);
            }
            tableBodyScale.appendChild(tableRow);
        }

        var strPlayer = parseInt(document.getElementById("strength").value)
        var dexPlayer = parseInt(document.getElementById("dexterity").value)
        var intPlayer = parseInt(document.getElementById("intelligence").value)
        var faiPlayer = parseInt(document.getElementById("faith").value)
        var arcPlayer = parseInt(document.getElementById("arcane").value)
        var vigPlayer = parseInt(document.getElementById("vigor").value)
        var minPlayer = parseInt(document.getElementById("mind").value)
        var endPlayer = parseInt(document.getElementById("endurance").value)
        var weaponLevel = parseInt(document.getElementById("upgrade-selection").value)

        var playerLevel = (strPlayer + dexPlayer + intPlayer + faiPlayer + arcPlayer + vigPlayer + minPlayer + endPlayer) - 79
        var upgradeCost = Math.floor((Math.pow(playerLevel + 81, 2) * (Math.max(((playerLevel + 81 - 92) * 0.02), 0) + 0.1)) + 1)

        if (document.getElementById("double-handed").checked) {
            strPlayer = parseInt(1.5 * strPlayer)
        }

        var playerStats = [strPlayer, dexPlayer, intPlayer, faiPlayer, arcPlayer]

        var levelDiv = document.getElementById("level")
        levelDiv.innerHTML = "Level: <b>" + playerLevel + "</b>. Runes to next level: <b>" + upgradeCost + "</b>"

        var requirementsDiv = document.getElementById("requirements")
        var reqDict = getRequirements(selectedWeaponName)
        var reqNames = Object.keys(reqDict)

        requirementsDiv.innerHTML = "Requirements: "
        var reqNotMet = []

        var statDict = {"Str": 0, "Dex": 1, "Int": 2, "Fai": 3, "Arc": 4}
        for (i in reqNames) {
            var reqValue = reqDict[reqNames[i]]
            requirementsDiv.innerHTML += reqNames[i] + ": " + reqValue + " "
            if (reqValue > playerStats[statDict[reqNames[i]]]) {
                requirementsDiv.innerHTML += "(not met) "
                reqNotMet.push(reqNames[i])
            } else requirementsDiv.innerHTML += "(met) "
        }

        var tableBodyCalc = document.getElementById("calculations");
        if (reqNotMet.length != 0) {
            tableBodyCalc.innerHTML = "Cannot calculate with not met requirements: <b>"
            for (i in reqNotMet) tableBodyCalc.innerHTML += i == 0 ? reqNotMet[i] : ", " + reqNotMet[i]
            return
        }

        var [baseDamageDict, scaleDamage, finalDamageOutput, total] = getStatFromPlayer(playerStats, selectedWeaponName, weaponLevel)

        var passEffect = getPassive(selectedWeaponName)

        tableBodyCalc.innerHTML = "Calculations";

        titleRow = document.createElement("tr");
        titleRow.classList.add("titleRow")
        titleRow.appendChild(document.createElement("td"));

        titleName = document.createElement("td")
        titleName.innerHTML = "Base Damage"
        titleRow.appendChild(titleName);
        
        for (i = 0; i < 5; i++) {
            titleName = document.createElement("td")
            titleName.innerHTML = sclList[i] + " Scaling"
            titleRow.appendChild(titleName);
        }

        titleName = document.createElement("td")
        titleName.innerHTML = "Final Damage"
        titleRow.appendChild(titleName);

        var passive1 = passEffect["Type 1"]
        var passive2 = passEffect["Type 2"]

        

        tableBodyCalc.appendChild(titleRow);

        for (i = 0; i < 5; i++) {
            tableRow = document.createElement("tr");
            attributeName = document.createElement("td");
            attributeName.classList.add("titleRow")
            attributeName.innerHTML = attList[i];
            tableRow.appendChild(attributeName);

            attributeValue = document.createElement("td");
            attributeValue.innerHTML = baseDamageDict[attList[i]].toFixed(2)
            tableRow.appendChild(attributeValue);
            tableBodyCalc.appendChild(tableRow);

            for (var j = 0; j < 5; j++) {
                attributeValue = document.createElement("td");
                var currentScale = scaleDamage[attList[i]][sclList[j]]
                attributeValue.innerHTML = (currentScale == 0 ? "-" : currentScale.toFixed(2))
                tableRow.appendChild(attributeValue);
                tableBodyCalc.appendChild(tableRow);

            }

            attributeValue = document.createElement("td");
            attributeValue.innerHTML = finalDamageOutput[attList[i]].toFixed(2)
            tableRow.appendChild(attributeValue);
            tableBodyCalc.appendChild(tableRow);

            if (i == 2) {
                attributeValue = document.createElement("td")
                attributeValue.innerHTML = "HP"
                tableRow.appendChild(attributeValue);

                attributeValue = document.createElement("td")
                attributeValue.innerHTML = "FP"
                tableRow.appendChild(attributeValue);

                attributeValue = document.createElement("td")
                attributeValue.innerHTML = "Stamina"
                tableRow.appendChild(attributeValue);

                attributeValue = document.createElement("td")
                attributeValue.innerHTML = "Eq. Load"
                tableRow.appendChild(attributeValue);

                attributeValue = document.createElement("td")
                attributeValue.innerHTML = "Mid Roll"
                tableRow.appendChild(attributeValue);
            }

            if (i == 3) {
                attributeValue = document.createElement("td")
                attributeValue.innerHTML = getHp(vigPlayer)
                tableRow.appendChild(attributeValue);
        
                attributeValue = document.createElement("td")
                attributeValue.innerHTML = getFp(minPlayer)
                tableRow.appendChild(attributeValue);
        
                attributeValue = document.createElement("td")
                attributeValue.innerHTML = getStamina(endPlayer)
                tableRow.appendChild(attributeValue);
        
                attributeValue = document.createElement("td")
                var eqLoad = getEquipLoad(endPlayer)
                attributeValue.innerHTML = eqLoad.toFixed(2)
                tableRow.appendChild(attributeValue);
        
                attributeValue = document.createElement("td")
                attributeValue.innerHTML = (eqLoad * 0.6999).toFixed(2)
                tableRow.appendChild(attributeValue);
        
                
            }

            if (i == 4) {
                // Passive effects title
                if (passive1 != "") {
                    attributeValue = document.createElement("td")
                    attributeValue.innerHTML = passive1
                    tableRow.appendChild(attributeValue);
                }

                if (passive2 != "") {
                    attributeValue = document.createElement("td")
                    attributeValue.innerHTML = passive2
                    tableRow.appendChild(attributeValue);
                }
            }
        }

        tableRow = document.createElement("tr");
        tableRow.classList.add("titleRow")

        attributeName = document.createElement("td");
        attributeName.classList.add("titleRow")
        attributeName.innerHTML = "TOTAL";
        tableRow.appendChild(attributeName);

        for (i = 0; i < 6; i++) tableRow.appendChild(document.createElement("td"));
        attributeValue = document.createElement("td");
        attributeValue.innerHTML = total.toFixed(2)
        tableRow.appendChild(attributeValue);

        // Passive effects value
        if (passive1 != "") {
            attributeValue = document.createElement("td")
            attributeValue.innerHTML = passEffect[passive1 + " +" + weaponLevel]
            tableRow.appendChild(attributeValue);
        }

        if (passive2 != "") {
            attributeValue = document.createElement("td")
            attributeValue.innerHTML = passEffect[passive2 + " +" + weaponLevel]
            tableRow.appendChild(attributeValue);
        }

        tableBodyCalc.appendChild(tableRow);
    });
}



function main() {
    
    statSelection()
    showWeapons()
    showUpgrade()
    showStartingClass()
    calculateButton()
}

main()
    