
import * as attackJson from './attack.json' assert { type: 'json' };
import * as scalingJson from './scaling.json' assert { type: 'json' };
import * as correctGraphId from './correctGraphId.json' assert { type: 'json' };
import * as correctGraph from './correctGraph.json' assert { type: 'json' };
import * as attackParam from './attackElementCorrectParam.json' assert { type: 'json' };

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
                if (cGraph["Stat " + k] <= playerStats[j]) {
                    StatMin = cGraph["Stat " + k]
                    ExponentMin = cGraph["Exponent " + k]
                    GrowMin = cGraph["Grow " + k]
                } 
                if (cGraph["Stat " + (5 - k)] > playerStats[j]){
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
    
        for (let i = 1; i <= 100; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.text = i;
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
        option.text = i;
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

        tableBody.innerHTML = "Attack";
        var attList = ["Phys", "Mag", "Fire", "Ligh", "Holy", "Stam"]

        var titleRow = document.createElement("tr");
        titleRow.classList.add("titleRow")
        titleRow.appendChild(document.createElement("td"));
        for (var i = 0; i <= 25; i++) {
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
            for (var j = 0; j <= 25; j++) {
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
        for (var i = 0; i <= 25; i++) {
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
            for (var j = 0; j <= 25; j++) {
                var nameCol = sclList[i] + " +" + j;
                var attributeValue = document.createElement("td");
                attributeValue.innerHTML = getLetterFromScaling(weaponScaling[0][nameCol])
                tableRow.appendChild(attributeValue);
            }
            tableBodyScale.appendChild(tableRow);
        }

        var strPlayer = document.getElementById("strength").value
        var dexPlayer = document.getElementById("dexterity").value
        var intPlayer = document.getElementById("intelligence").value
        var faiPlayer = document.getElementById("faith").value
        var arcPlayer = document.getElementById("arcane").value
        var weaponLevel = document.getElementById("upgrade-selection").value
        var playerStats = [strPlayer, dexPlayer, intPlayer, faiPlayer, arcPlayer]

        var [baseDamageDict, scaleDamage, finalDamageOutput, total] = getStatFromPlayer(playerStats, selectedWeaponName, weaponLevel)


        const tableBodyCalc = document.getElementById("calculations");
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
    