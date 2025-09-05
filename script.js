class ChampionshipManager {
    constructor() {
        this.teams = JSON.parse(localStorage.getItem('teams')) || [];
        this.matches = JSON.parse(localStorage.getItem('matches')) || [];
        this.config = JSON.parse(localStorage.getItem('config')) || {
            name: '',
            type: 'group',
            numGroups: 2,
            groupsDistribution: [],
            eliminationType: 'single'
        };
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadConfig();
        this.renderTeams();
        this.renderMatches();
        this.renderResults();
        this.updateClassificationTable();
        this.updateTeamSelects();
        this.updateMatchSelects();
        this.updateInterfaceBasedOnConfig();
    }

    updateInterfaceBasedOnConfig() {
        // Atualizar interface baseada na configuração salva
        if (this.config.structure === 'advanced' && this.config.phases) {
            this.renderChampionshipSchema();
            this.renderPhaseNavigation();
        } else if (this.config.type === 'group') {
            this.renderGroupsDistribution();
        }
    }

    renderChampionshipSchema() {
        const schemaContainer = document.getElementById('schema-container');
        const championshipSchema = document.getElementById('championship-schema');
        
        if (!this.config.phases || this.config.phases.length === 0) {
            championshipSchema.style.display = 'none';
            return;
        }
        
        let schemaHTML = '';
        
        this.config.phases.forEach((phase, index) => {
            const teamsCount = this.getTeamsCountForPhase(phase, index);
            
            schemaHTML += `
                <div class="schema-phase">
                    <h4>${phase.name}</h4>
                    <div class="schema-teams">
                        <div><strong>${teamsCount} equipes</strong></div>
                        <div>${phase.type === 'group' ? `${phase.numGroups} grupos` : phase.eliminationType}</div>
                        ${phase.advancement ? `<div>↓ ${phase.advancement} classificam</div>` : ''}
                    </div>
                </div>
            `;
            
            if (index < this.config.phases.length - 1) {
                schemaHTML += '<span class="schema-arrow">→</span>';
            }
        });
        
        schemaContainer.innerHTML = schemaHTML;
        championshipSchema.style.display = 'block';
    }

    getTeamsCountForPhase(phase, phaseIndex) {
        if (phaseIndex === 0) {
            return this.teams.length || 16; // Primeira fase usa todas as equipes
        }
        
        const previousPhase = this.config.phases[phaseIndex - 1];
        return previousPhase.advancement || 8;
    }

    renderPhaseNavigation() {
        const phaseNavigation = document.getElementById('phase-navigation');
        const phaseTabs = document.getElementById('phase-tabs');
        
        if (!this.config.phases || this.config.phases.length === 0) {
            phaseNavigation.style.display = 'none';
            return;
        }
        
        let tabsHTML = '';
        
        this.config.phases.forEach((phase, index) => {
            const isActive = index === 0; // Primeira fase sempre ativa inicialmente
            const isDisabled = false; // Por enquanto, todas as fases são acessíveis
            
            tabsHTML += `
                <button class="phase-tab ${isActive ? 'active' : ''} ${isDisabled ? 'disabled' : ''}" 
                        onclick="championship.switchToPhase(${index})" 
                        ${isDisabled ? 'disabled' : ''}>
                    ${phase.name}
                </button>
            `;
        });
        
        phaseTabs.innerHTML = tabsHTML;
        phaseNavigation.style.display = 'block';
        
        // Renderizar conteúdo da primeira fase
        this.renderPhaseContent(0);
    }

    switchToPhase(phaseIndex) {
        // Atualizar tabs ativas
        document.querySelectorAll('.phase-tab').forEach((tab, index) => {
            tab.classList.toggle('active', index === phaseIndex);
        });
        
        // Renderizar conteúdo da fase
        this.renderPhaseContent(phaseIndex);
    }

    renderPhaseContent(phaseIndex) {
        const phase = this.config.phases[phaseIndex];
        const tablesContent = document.getElementById('tables-content');
        
        if (!phase) {
            tablesContent.innerHTML = '<p>Fase não encontrada.</p>';
            return;
        }
        
        let contentHTML = `<h3>📋 ${phase.name}</h3>`;
        
        if (phase.type === 'group') {
            contentHTML += this.renderPhaseGroupTables(phase, phaseIndex);
        } else {
            contentHTML += this.renderPhaseEliminationBracket(phase, phaseIndex);
        }
        
        // Adicionar botão de avanço se não for a última fase
        if (phaseIndex < this.config.phases.length - 1 && phase.advancement) {
            contentHTML += `
                <div class="phase-advancement">
                    <button class="btn-advance" onclick="championship.advanceTeamsToNextPhase(${phaseIndex})">
                        Avançar ${phase.advancement} equipes para ${this.config.phases[phaseIndex + 1].name}
                    </button>
                    <p class="advancement-info">
                        ${phase.advancement} melhores equipes desta fase avançarão para a próxima
                    </p>
                </div>
            `;
        }
        
        tablesContent.innerHTML = contentHTML;
    }

    renderPhaseGroupTables(phase, phaseIndex) {
        let html = '<div class="phase-groups">';
        
        // Calcular quantas equipes se classificam por grupo
        const teamsPerGroup = phase.advancement ? Math.ceil(phase.advancement / phase.numGroups) : 0;
        
        for (let i = 0; i < phase.numGroups; i++) {
            const groupLetter = String.fromCharCode(65 + i); // A, B, C...
            
            html += `
                <div class="group-table">
                    <div class="group-header">
                        <h4>Grupo ${groupLetter}</h4>
                        <span class="team-count">0 times</span>
                        ${phase.advancement ? `<span class="qualification-info">${teamsPerGroup} classificam</span>` : ''}
                    </div>
                    <table class="classification-table">
                        <thead>
                            <tr>
                                <th>Pos</th>
                                <th>Time</th>
                                <th>PJ</th>
                                <th>V</th>
                                <th>E</th>
                                <th>D</th>
                                <th>GP</th>
                                <th>GC</th>
                                <th>SG</th>
                                <th>Pts</th>
                                ${phase.advancement ? '<th>Status</th>' : ''}
                            </tr>
                        </thead>
                        <tbody>
                            ${this.renderPhaseGroupTableRows(phase, phaseIndex, i, teamsPerGroup)}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        html += '</div>';
        return html;
    }
    
    renderPhaseGroupTableRows(phase, phaseIndex, groupIndex, teamsPerGroup) {
        // Verificar se há times configurados para esta fase
        const phaseTeamsKey = `phase_${phaseIndex}_teams`;
        const phaseTeams = JSON.parse(localStorage.getItem(phaseTeamsKey) || '[]');
        
        if (phaseTeams.length === 0) {
            return `
                <tr>
                    <td colspan="${phase.advancement ? '11' : '10'}" style="text-align: center; padding: 20px; color: #718096;">
                        Aguardando times para esta fase
                    </td>
                </tr>
            `;
        }
        
        // Filtrar times do grupo atual
        const groupTeams = phaseTeams.filter(team => team.group === groupIndex);
        
        if (groupTeams.length === 0) {
            return `
                <tr>
                    <td colspan="${phase.advancement ? '11' : '10'}" style="text-align: center; padding: 20px; color: #718096;">
                        Nenhum time neste grupo
                    </td>
                </tr>
            `;
        }
        
        // Calcular estatísticas dos times baseado nas partidas da fase
        const phaseMatchesKey = `phase_${phaseIndex}_matches`;
        const phaseMatches = JSON.parse(localStorage.getItem(phaseMatchesKey) || '[]');
        
        // Inicializar estatísticas
        const teamStats = {};
        groupTeams.forEach(team => {
            teamStats[team.id] = {
                name: team.name,
                matches: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0
            };
        });
        
        // Processar partidas com resultados
        phaseMatches.forEach(match => {
            if (match.result && match.result.team1Goals !== undefined && match.result.team2Goals !== undefined) {
                const team1Stats = teamStats[match.team1Id];
                const team2Stats = teamStats[match.team2Id];
                
                if (team1Stats && team2Stats) {
                    const goals1 = parseInt(match.result.team1Goals);
                    const goals2 = parseInt(match.result.team2Goals);
                    
                    team1Stats.matches++;
                    team2Stats.matches++;
                    team1Stats.goalsFor += goals1;
                    team1Stats.goalsAgainst += goals2;
                    team2Stats.goalsFor += goals2;
                    team2Stats.goalsAgainst += goals1;
                    
                    if (goals1 > goals2) {
                        team1Stats.wins++;
                        team1Stats.points += 3;
                        team2Stats.losses++;
                    } else if (goals1 < goals2) {
                        team2Stats.wins++;
                        team2Stats.points += 3;
                        team1Stats.losses++;
                    } else {
                        team1Stats.draws++;
                        team2Stats.draws++;
                        team1Stats.points += 1;
                        team2Stats.points += 1;
                    }
                }
            }
        });
        
        // Ordenar times por pontos, saldo de gols e gols pró
        const sortedTeams = Object.values(teamStats).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            const saldoA = a.goalsFor - a.goalsAgainst;
            const saldoB = b.goalsFor - b.goalsAgainst;
            if (saldoB !== saldoA) return saldoB - saldoA;
            return b.goalsFor - a.goalsFor;
        });
        
        // Renderizar linhas da tabela
        return sortedTeams.map((team, index) => {
            const saldo = team.goalsFor - team.goalsAgainst;
            let statusCell = '';
            
            if (phase.advancement) {
                let status = 'pending';
                let statusText = 'Pendente';
                
                if (index < teamsPerGroup) {
                    status = 'qualified';
                    statusText = 'Classificado';
                } else if (team.matches > 0) {
                    status = 'eliminated';
                    statusText = 'Eliminado';
                }
                
                statusCell = `<td><span class="status-${status}">${statusText}</span></td>`;
            }
            
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td style="text-align: left; font-weight: 600;">${team.name}</td>
                    <td>${team.matches}</td>
                    <td>${team.wins}</td>
                    <td>${team.draws}</td>
                    <td>${team.losses}</td>
                    <td>${team.goalsFor}</td>
                    <td>${team.goalsAgainst}</td>
                    <td>${saldo >= 0 ? '+' : ''}${saldo}</td>
                    <td style="font-weight: bold; color: #667eea;">${team.points}</td>
                    ${statusCell}
                </tr>
            `;
        }).join('');
    }

    renderPhaseEliminationBracket(phase, phaseIndex) {
        return `
            <div class="elimination-bracket">
                <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 8px; color: #718096;">
                    <h4>Chaveamento da ${phase.name}</h4>
                    <p>Tipo: ${phase.eliminationType === 'single' ? 'Eliminação Simples' : 'Eliminação Dupla'}</p>
                    <p>Aguardando times classificados da fase anterior</p>
                </div>
            </div>
        `;
    }

    // Sistema de Avanço de Equipes
    advanceTeamsToNextPhase(currentPhaseIndex) {
        if (!this.config.phases || currentPhaseIndex >= this.config.phases.length - 1) {
            return; // Não há próxima fase
        }

        const currentPhase = this.config.phases[currentPhaseIndex];
        const nextPhase = this.config.phases[currentPhaseIndex + 1];
        
        if (!currentPhase.advancement) {
            this.showMessage('Número de equipes que avançam não foi configurado para esta fase.', 'error');
            return;
        }

        let qualifiedTeams = [];

        if (currentPhase.type === 'group') {
            qualifiedTeams = this.getQualifiedTeamsFromGroups(currentPhase);
        } else {
            qualifiedTeams = this.getQualifiedTeamsFromElimination(currentPhase);
        }

        if (qualifiedTeams.length < currentPhase.advancement) {
            this.showMessage(`Ainda não há equipes suficientes classificadas. Necessário: ${currentPhase.advancement}, Atual: ${qualifiedTeams.length}`, 'warning');
            return;
        }

        // Configurar equipes para a próxima fase
        this.setupTeamsForPhase(nextPhase, qualifiedTeams.slice(0, currentPhase.advancement), currentPhaseIndex + 1);
        
        this.showMessage(`${currentPhase.advancement} equipes avançaram para ${nextPhase.name}!`, 'success');
        this.updateInterfaceBasedOnConfig();
    }

    getQualifiedTeamsFromGroups(phase) {
        const qualifiedTeams = [];
        
        if (!this.config.groupsDistribution) return qualifiedTeams;

        this.config.groupsDistribution.forEach(group => {
            const groupTeams = group.teams.map(teamData => {
                const team = this.teams.find(t => t.id === teamData.id);
                return team || teamData;
            });

            // Ordenar por pontos, saldo de gols, etc.
            const sortedTeams = groupTeams.sort((a, b) => {
                if (b.stats.points !== a.stats.points) {
                    return b.stats.points - a.stats.points;
                }
                const saldoA = a.stats.goalsFor - a.stats.goalsAgainst;
                const saldoB = b.stats.goalsFor - b.stats.goalsAgainst;
                if (saldoB !== saldoA) {
                    return saldoB - saldoA;
                }
                return b.stats.goalsFor - a.stats.goalsFor;
            });

            // Pegar os primeiros colocados de cada grupo
            const teamsPerGroup = Math.ceil(phase.advancement / phase.numGroups);
            qualifiedTeams.push(...sortedTeams.slice(0, teamsPerGroup));
        });

        return qualifiedTeams;
    }

    getQualifiedTeamsFromElimination(phase) {
        // Implementação futura para eliminatórias
        return [];
    }

    setupTeamsForPhase(phase, teams, phaseIndex) {
        if (phase.type === 'group') {
            // Distribuir equipes nos grupos da próxima fase
            this.distributeTeamsInPhaseGroups(phase, teams, phaseIndex);
        } else {
            // Configurar chave eliminatória
            this.setupEliminationBracket(phase, teams, phaseIndex);
        }
    }

    distributeTeamsInPhaseGroups(phase, teams, phaseIndex) {
        const teamsPerGroup = Math.ceil(teams.length / phase.numGroups);
        const phaseGroups = [];

        for (let i = 0; i < phase.numGroups; i++) {
            const groupTeams = teams.slice(i * teamsPerGroup, (i + 1) * teamsPerGroup);
            phaseGroups.push({
                name: `Grupo ${String.fromCharCode(65 + i)} - ${phase.name}`,
                teams: groupTeams.map(team => ({
                    id: team.id,
                    name: team.name
                }))
            });
        }

        // Salvar configuração da fase
        if (!this.config.phaseConfigurations) {
            this.config.phaseConfigurations = {};
        }
        
        this.config.phaseConfigurations[phaseIndex] = {
            groupsDistribution: phaseGroups
        };
        
        localStorage.setItem('config', JSON.stringify(this.config));
    }

    setupEliminationBracket(phase, teams, phaseIndex) {
        // Implementação futura para chaves eliminatórias
        if (!this.config.phaseConfigurations) {
            this.config.phaseConfigurations = {};
        }
        
        this.config.phaseConfigurations[phaseIndex] = {
            eliminationTeams: teams.map(team => ({
                id: team.id,
                name: team.name
            }))
        };
        
        localStorage.setItem('config', JSON.stringify(this.config));
    }

    setupEventListeners() {
        // Navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // Configuração
        document.getElementById('tournament-structure').addEventListener('change', () => {
            this.toggleConfigSections();
        });
        document.getElementById('simple-type').addEventListener('change', () => {
            this.toggleSimpleConfigSections();
        });
        document.getElementById('num-phases').addEventListener('change', () => {
            this.setupPhases();
        });
        document.getElementById('save-config').addEventListener('click', () => {
            this.saveConfig();
        });
        const simpleSetupGroupsBtn = document.getElementById('simple-setup-groups');
        if (simpleSetupGroupsBtn) {
            simpleSetupGroupsBtn.addEventListener('click', () => {
                this.setupGroupsDistribution();
            });
        }
        const numGroupsElement = document.getElementById('num-groups');
        if (numGroupsElement) {
            numGroupsElement.addEventListener('change', () => {
                this.hideGroupsDistribution();
            });
        }

        // Times
        document.getElementById('add-team').addEventListener('click', () => {
            this.addTeam();
        });

        // Agenda
        document.getElementById('schedule-match').addEventListener('click', () => {
            this.scheduleMatch();
        });

        // Resultados
        document.getElementById('result-match').addEventListener('change', (e) => {
            this.loadMatchForResult(e.target.value);
        });
        document.getElementById('save-result').addEventListener('click', () => {
            this.saveResult();
        });
    }

    switchSection(sectionName) {
        // Remove active class from all sections and buttons
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        // Add active class to selected section and button
        document.getElementById(sectionName).classList.add('active');
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    }

    toggleConfigSections() {
        const tournamentStructure = document.getElementById('tournament-structure').value;
        const simpleConfig = document.getElementById('simple-config');
        const advancedConfig = document.getElementById('advanced-config');
        
        if (tournamentStructure === 'simple') {
            simpleConfig.style.display = 'block';
            advancedConfig.style.display = 'none';
            this.toggleSimpleConfigSections();
        } else {
            simpleConfig.style.display = 'none';
            advancedConfig.style.display = 'block';
        }
    }

    toggleSimpleConfigSections() {
        const simpleType = document.getElementById('simple-type').value;
        const groupConfig = document.getElementById('simple-group-config');
        const eliminationConfig = document.getElementById('simple-elimination-config');
        
        if (simpleType === 'group') {
            groupConfig.style.display = 'block';
            eliminationConfig.style.display = 'none';
        } else {
            groupConfig.style.display = 'none';
            eliminationConfig.style.display = 'block';
        }
    }

    setupPhases() {
        const numPhases = parseInt(document.getElementById('num-phases').value);
        const phasesContainer = document.getElementById('phases-container');
        const phasesConfiguration = document.getElementById('phases-configuration');
        
        phasesContainer.innerHTML = '';
        
        for (let i = 1; i <= numPhases; i++) {
            const phaseDiv = document.createElement('div');
            phaseDiv.className = 'phase-config';
            phaseDiv.innerHTML = `
                <h4>
                    <span class="phase-number">${i}</span>
                    Fase ${i} ${i === 1 ? '(Inicial)' : i === numPhases ? '(Final)' : ''}
                </h4>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="phase-${i}-type">Tipo da Fase:</label>
                        <select id="phase-${i}-type" onchange="championship.togglePhaseConfig(${i})">
                            <option value="group">Fase de Grupos</option>
                            <option value="elimination">Eliminatória</option>
                        </select>
                    </div>
                    
                    <div class="form-group" id="phase-${i}-groups-config">
                        <label for="phase-${i}-groups">Número de Grupos:</label>
                        <input type="number" id="phase-${i}-groups" min="1" max="8" value="2">
                    </div>
                    
                    <div class="form-group" id="phase-${i}-elimination-config" style="display: none;">
                        <label for="phase-${i}-elimination-type">Tipo de Eliminatória:</label>
                        <select id="phase-${i}-elimination-type">
                            <option value="single">Eliminação Simples</option>
                            <option value="double">Eliminação Dupla</option>
                        </select>
                    </div>
                </div>
                
                ${i < numPhases ? `
                    <div class="advancement-config">
                        <label for="phase-${i}-advancement">Equipes que avançam para a Fase ${i + 1}:</label>
                        <input type="number" id="phase-${i}-advancement" min="1" value="${Math.max(2, Math.ceil(16 / Math.pow(2, i-1)))}">
                        <p class="form-help">Número total de equipes que se classificam desta fase</p>
                    </div>
                ` : ''}
            `;
            
            phasesContainer.appendChild(phaseDiv);
        }
        
        phasesConfiguration.style.display = 'block';
    }

    togglePhaseConfig(phaseNumber) {
        const phaseType = document.getElementById(`phase-${phaseNumber}-type`).value;
        const groupsConfig = document.getElementById(`phase-${phaseNumber}-groups-config`);
        const eliminationConfig = document.getElementById(`phase-${phaseNumber}-elimination-config`);
        
        if (phaseType === 'group') {
            groupsConfig.style.display = 'block';
            eliminationConfig.style.display = 'none';
        } else {
            groupsConfig.style.display = 'none';
            eliminationConfig.style.display = 'block';
        }
    }

    saveConfig() {
        const structure = document.getElementById('tournament-structure').value;
        
        const config = {
            name: document.getElementById('championship-name').value,
            structure: structure,
            roundTrip: document.getElementById('round-trip').checked
        };
        
        if (structure === 'simple') {
            const simpleType = document.getElementById('simple-type').value;
            config.type = simpleType;
            
            if (simpleType === 'group') {
                config.numGroups = parseInt(document.getElementById('simple-num-groups').value) || 2;
            } else {
                config.eliminationType = document.getElementById('simple-elimination-type').value;
            }
        } else {
            // Configuração avançada
            const numPhases = parseInt(document.getElementById('num-phases').value) || 2;
            config.phases = [];
            
            for (let i = 1; i <= numPhases; i++) {
                const phaseType = document.getElementById(`phase-${i}-type`).value;
                const phase = {
                    number: i,
                    type: phaseType,
                    name: `Fase ${i}`
                };
                
                if (phaseType === 'group') {
                    phase.numGroups = parseInt(document.getElementById(`phase-${i}-groups`).value) || 2;
                } else {
                    phase.eliminationType = document.getElementById(`phase-${i}-elimination-type`).value;
                }
                
                if (i < numPhases) {
                    phase.advancement = parseInt(document.getElementById(`phase-${i}-advancement`).value) || 2;
                }
                
                config.phases.push(phase);
            }
        }
        
        // Manter distribuição de grupos se existir
        config.groupsDistribution = this.config.groupsDistribution || [];
        
        this.config = config;
        localStorage.setItem('config', JSON.stringify(this.config));
        this.showMessage('Configuração salva com sucesso!', 'success');
    }

    loadConfig() {
        document.getElementById('championship-name').value = this.config.name || '';
        
        const structure = this.config.structure || 'simple';
        document.getElementById('tournament-structure').value = structure;
        document.getElementById('round-trip').checked = this.config.roundTrip || false;
        
        if (structure === 'simple') {
            const type = this.config.type || 'group';
            document.getElementById('simple-type').value = type;
            
            if (type === 'group') {
                document.getElementById('simple-num-groups').value = this.config.numGroups || 2;
            } else {
                document.getElementById('simple-elimination-type').value = this.config.eliminationType || 'single';
            }
        } else if (this.config.phases) {
            document.getElementById('num-phases').value = this.config.phases.length;
            this.setupPhases();
            
            // Carregar configurações de cada fase
            this.config.phases.forEach(phase => {
                document.getElementById(`phase-${phase.number}-type`).value = phase.type;
                
                if (phase.type === 'group') {
                    document.getElementById(`phase-${phase.number}-groups`).value = phase.numGroups || 2;
                } else {
                    document.getElementById(`phase-${phase.number}-elimination-type`).value = phase.eliminationType || 'single';
                }
                
                if (phase.advancement) {
                    document.getElementById(`phase-${phase.number}-advancement`).value = phase.advancement;
                }
                
                this.togglePhaseConfig(phase.number);
            });
        }
        
        this.toggleConfigSections();
        
        if (this.config.groupsDistribution && this.config.groupsDistribution.length > 0) {
            this.renderGroupsDistribution();
        }
    }

    addTeam() {
        const name = document.getElementById('team-name').value.trim();

        if (!name) {
            this.showMessage('Por favor, digite o nome do time.', 'error');
            return;
        }

        if (this.teams.find(team => team.name.toLowerCase() === name.toLowerCase())) {
            this.showMessage('Já existe um time com este nome.', 'error');
            return;
        }

        const team = {
            id: Date.now(),
            name: name,
            stats: {
                matches: 0,
                wins: 0,
                draws: 0,
                losses: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0
            }
        };

        this.teams.push(team);
        this.saveTeams();
        this.renderTeams();
        this.updateTeamSelects();
        
        // Limpar formulário
        document.getElementById('team-name').value = '';
        
        this.showMessage('Time adicionado com sucesso!', 'success');
    }

    deleteTeam(teamId) {
        if (confirm('Tem certeza que deseja excluir este time?')) {
            this.teams = this.teams.filter(team => team.id !== teamId);
            this.saveTeams();
            this.renderTeams();
            this.updateTeamSelects();
            this.showMessage('Time excluído com sucesso!', 'success');
        }
    }

    renderTeams() {
        const container = document.getElementById('teams-container');
        
        if (this.teams.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum time cadastrado ainda.</div>';
            return;
        }

        container.innerHTML = this.teams.map(team => `
            <div class="team-card">
                <div class="team-info">
                    <div class="team-name">${team.name}</div>
                </div>
                <button class="btn-delete" onclick="championship.deleteTeam(${team.id})">
                    Excluir
                </button>
            </div>
        `).join('');
    }

    updateTeamSelects() {
        const selects = ['match-team1', 'match-team2'];
        
        selects.forEach(selectId => {
            const select = document.getElementById(selectId);
            
            if (this.config.type === 'group' && this.config.groupsDistribution && this.config.groupsDistribution.length > 0) {
                // Organizar times por grupo
                let html = '<option value="">Selecione um time</option>';
                
                this.config.groupsDistribution.forEach((group, groupIndex) => {
                    const groupTeams = (group.teams || []).map(gt => 
                        this.teams.find(t => t.id === gt.id)
                    ).filter(t => t);
                    
                    if (groupTeams.length > 0) {
                        html += `<optgroup label="Grupo ${String.fromCharCode(65 + groupIndex)}">`;
                        groupTeams.forEach(team => {
                            html += `<option value="${team.id}">${team.name}</option>`;
                        });
                        html += '</optgroup>';
                    }
                });
                
                // Times não alocados
                const unallocatedTeams = this.teams.filter(team => 
                    !this.config.groupsDistribution.some(group => 
                        (group.teams || []).some(t => t.id === team.id)
                    )
                );
                
                if (unallocatedTeams.length > 0) {
                    html += '<optgroup label="Times não alocados">';
                    unallocatedTeams.forEach(team => {
                        html += `<option value="${team.id}">${team.name}</option>`;
                    });
                    html += '</optgroup>';
                }
                
                select.innerHTML = html;
            } else {
                // Modo normal (sem grupos)
                select.innerHTML = '<option value="">Selecione um time</option>' +
                    this.teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('');
            }
        });
        
        // Adicionar event listeners para filtro dinâmico
        this.setupDynamicTeamFiltering();
    }

    setupDynamicTeamFiltering() {
        const team1Select = document.getElementById('match-team1');
        const team2Select = document.getElementById('match-team2');
        
        // Remover listeners anteriores
        team1Select.removeEventListener('change', this.handleTeam1Change);
        team2Select.removeEventListener('change', this.handleTeam2Change);
        
        // Adicionar novos listeners
        this.handleTeam1Change = (e) => {
            this.filterTeam2Options(e.target.value);
            this.updateTeamGroupIndicator(e.target.value, 'team1-group-indicator');
        };
        this.handleTeam2Change = (e) => {
            this.filterTeam1Options(e.target.value);
            this.updateTeamGroupIndicator(e.target.value, 'team2-group-indicator');
        };
        
        team1Select.addEventListener('change', this.handleTeam1Change);
        team2Select.addEventListener('change', this.handleTeam2Change);
    }

    updateTeamGroupIndicator(teamId, indicatorId) {
        const indicator = document.getElementById(indicatorId);
        if (!indicator || !teamId) {
            if (indicator) indicator.style.display = 'none';
            this.validateMatchCompatibility();
            return;
        }
        
        if (this.config.type === 'group' && this.config.groupsDistribution) {
            const groupIndex = this.getTeamGroup(parseInt(teamId));
            if (groupIndex !== null) {
                const groupLetter = String.fromCharCode(65 + groupIndex);
                indicator.textContent = `Grupo ${groupLetter}`;
                indicator.style.display = 'inline-block';
                indicator.style.background = '#667eea';
            } else {
                indicator.textContent = 'Sem grupo';
                indicator.style.display = 'inline-block';
                indicator.style.background = '#ff6b6b';
            }
        } else {
            indicator.style.display = 'none';
        }
        
        this.validateMatchCompatibility();
    }
    
    validateMatchCompatibility() {
        const team1Select = document.getElementById('match-team1');
        const team2Select = document.getElementById('match-team2');
        const scheduleBtn = document.querySelector('.schedule-form button[type="submit"]');
        const compatibilityMessage = document.getElementById('compatibility-message');
        
        if (!team1Select || !team2Select || !scheduleBtn) return;
        
        const team1Id = parseInt(team1Select.value);
        const team2Id = parseInt(team2Select.value);
        
        // Limpar mensagem anterior
        if (compatibilityMessage) {
            compatibilityMessage.remove();
        }
        
        if (!team1Id || !team2Id) {
            scheduleBtn.disabled = false;
            return;
        }
        
        if (team1Id === team2Id) {
            this.showCompatibilityMessage('Um time não pode jogar contra si mesmo.', 'error');
            scheduleBtn.disabled = true;
            return;
        }
        
        if (this.config.type === 'group' && this.config.groupsDistribution) {
            const team1Group = this.getTeamGroup(team1Id);
            const team2Group = this.getTeamGroup(team2Id);
            
            if (team1Group === null || team2Group === null) {
                const team1Name = this.teams.find(t => t.id === team1Id)?.name;
                const team2Name = this.teams.find(t => t.id === team2Id)?.name;
                const unallocatedTeam = team1Group === null ? team1Name : team2Name;
                this.showCompatibilityMessage(`O time "${unallocatedTeam}" não foi alocado em nenhum grupo.`, 'error');
                scheduleBtn.disabled = true;
                return;
            }
            
            if (team1Group !== team2Group) {
                const team1Name = this.teams.find(t => t.id === team1Id)?.name;
                const team2Name = this.teams.find(t => t.id === team2Id)?.name;
                const group1Letter = String.fromCharCode(65 + team1Group);
                const group2Letter = String.fromCharCode(65 + team2Group);
                this.showCompatibilityMessage(`Times de grupos diferentes não podem jogar entre si. "${team1Name}" (Grupo ${group1Letter}) vs "${team2Name}" (Grupo ${group2Letter}).`, 'error');
                scheduleBtn.disabled = true;
                return;
            }
            
            // Times do mesmo grupo - válido
            const groupLetter = String.fromCharCode(65 + team1Group);
            this.showCompatibilityMessage(`✓ Partida válida entre times do Grupo ${groupLetter}.`, 'success');
        }
        
        scheduleBtn.disabled = false;
    }
    
    showCompatibilityMessage(message, type) {
        const scheduleForm = document.querySelector('.schedule-form');
        const existingMessage = document.getElementById('compatibility-message');
        
        if (existingMessage) {
            existingMessage.remove();
        }
        
        const messageDiv = document.createElement('div');
        messageDiv.id = 'compatibility-message';
        messageDiv.className = `compatibility-message ${type}`;
        messageDiv.textContent = message;
        
        const submitButton = scheduleForm.querySelector('button[type="submit"]');
        scheduleForm.insertBefore(messageDiv, submitButton);
    }

    filterTeam2Options(selectedTeam1Id) {
        const team2Select = document.getElementById('match-team2');
        const originalOptions = team2Select.querySelectorAll('option, optgroup');
        
        if (!selectedTeam1Id || this.config.type !== 'group' || !this.config.groupsDistribution || this.config.groupsDistribution.length === 0) {
            // Mostrar todas as opções se não há time selecionado ou não é modo grupo
            originalOptions.forEach(option => {
                if (option.value !== selectedTeam1Id) {
                    option.style.display = '';
                } else {
                    option.style.display = 'none';
                }
            });
            return;
        }
        
        const selectedTeam1Group = this.getTeamGroup(parseInt(selectedTeam1Id));
        
        originalOptions.forEach(option => {
            if (option.tagName === 'OPTGROUP') {
                const groupLabel = option.label;
                const isSelectedGroup = groupLabel.includes(`Grupo ${String.fromCharCode(65 + selectedTeam1Group)}`);
                option.style.display = isSelectedGroup || groupLabel.includes('não alocados') ? '' : 'none';
            } else if (option.value) {
                const teamGroup = this.getTeamGroup(parseInt(option.value));
                const isSameGroup = teamGroup === selectedTeam1Group;
                const isSameTeam = option.value === selectedTeam1Id;
                option.style.display = (isSameGroup && !isSameTeam) ? '' : 'none';
            }
        });
    }

    filterTeam1Options(selectedTeam2Id) {
        const team1Select = document.getElementById('match-team1');
        const originalOptions = team1Select.querySelectorAll('option, optgroup');
        
        if (!selectedTeam2Id || this.config.type !== 'group' || !this.config.groupsDistribution || this.config.groupsDistribution.length === 0) {
            // Mostrar todas as opções se não há time selecionado ou não é modo grupo
            originalOptions.forEach(option => {
                if (option.value !== selectedTeam2Id) {
                    option.style.display = '';
                } else {
                    option.style.display = 'none';
                }
            });
            return;
        }
        
        const selectedTeam2Group = this.getTeamGroup(parseInt(selectedTeam2Id));
        
        originalOptions.forEach(option => {
            if (option.tagName === 'OPTGROUP') {
                const groupLabel = option.label;
                const isSelectedGroup = groupLabel.includes(`Grupo ${String.fromCharCode(65 + selectedTeam2Group)}`);
                option.style.display = isSelectedGroup || groupLabel.includes('não alocados') ? '' : 'none';
            } else if (option.value) {
                const teamGroup = this.getTeamGroup(parseInt(option.value));
                const isSameGroup = teamGroup === selectedTeam2Group;
                const isSameTeam = option.value === selectedTeam2Id;
                option.style.display = (isSameGroup && !isSameTeam) ? '' : 'none';
            }
        });
    }

    scheduleMatch() {
        const team1Id = parseInt(document.getElementById('match-team1').value);
        const team2Id = parseInt(document.getElementById('match-team2').value);
        const date = document.getElementById('match-date').value;
        const time = document.getElementById('match-time').value;
        const location = document.getElementById('match-location').value.trim();

        if (!team1Id || !team2Id) {
            this.showMessage('Por favor, selecione os dois times.', 'error');
            return;
        }

        if (team1Id === team2Id) {
            this.showMessage('Um time não pode jogar contra si mesmo.', 'error');
            return;
        }

        if (!date || !time) {
            this.showMessage('Por favor, informe a data e horário do jogo.', 'error');
            return;
        }

        // Validar se os times estão no mesmo grupo (quando há distribuição por grupos)
        if (this.config.type === 'group' && this.config.groupsDistribution && this.config.groupsDistribution.length > 0) {
            const team1Group = this.getTeamGroup(team1Id);
            const team2Group = this.getTeamGroup(team2Id);
            
            const team1Name = this.teams.find(t => t.id === team1Id)?.name;
            const team2Name = this.teams.find(t => t.id === team2Id)?.name;
            
            if (team1Group === null || team2Group === null) {
                const unallocatedTeam = team1Group === null ? team1Name : team2Name;
                this.showMessage(`O time "${unallocatedTeam}" não foi alocado em nenhum grupo. Aloque todos os times antes de agendar jogos.`, 'error');
                return;
            }
            
            if (team1Group !== team2Group) {
                const group1Letter = String.fromCharCode(65 + team1Group);
                const group2Letter = String.fromCharCode(65 + team2Group);
                this.showMessage(`Times de grupos diferentes não podem jogar entre si na fase de grupos. "${team1Name}" está no Grupo ${group1Letter} e "${team2Name}" está no Grupo ${group2Letter}.`, 'error');
                return;
            }
        }

        const team1 = this.teams.find(t => t.id === team1Id);
        const team2 = this.teams.find(t => t.id === team2Id);

        // Verificar se é ida e volta
        const isRoundTrip = this.config.roundTrip;
        const matches = [];

        // Jogo de ida
        const firstMatch = {
            id: Date.now(),
            team1: { id: team1Id, name: team1.name },
            team2: { id: team2Id, name: team2.name },
            date: date,
            time: time,
            location: location,
            status: 'scheduled',
            result: null,
            leg: isRoundTrip ? 'ida' : null
        };
        matches.push(firstMatch);

        // Jogo de volta (se configurado)
        if (isRoundTrip) {
            const returnDate = new Date(date);
            returnDate.setDate(returnDate.getDate() + 7); // Uma semana depois
            
            const secondMatch = {
                id: Date.now() + 1,
                team1: { id: team2Id, name: team2.name }, // Times invertidos
                team2: { id: team1Id, name: team1.name },
                date: returnDate.toISOString().split('T')[0],
                time: time,
                location: location,
                status: 'scheduled',
                result: null,
                leg: 'volta'
            };
            matches.push(secondMatch);
        }

        this.matches.push(...matches);
        this.saveMatches();
        this.renderMatches();
        this.updateMatchSelects();
        
        // Limpar formulário
        document.getElementById('match-team1').value = '';
        document.getElementById('match-team2').value = '';
        document.getElementById('match-date').value = '';
        document.getElementById('match-time').value = '';
        document.getElementById('match-location').value = '';
        
        const message = isRoundTrip ? 'Jogos de ida e volta agendados com sucesso!' : 'Jogo agendado com sucesso!';
        this.showMessage(message, 'success');
    }

    deleteMatch(matchId) {
        if (confirm('Tem certeza que deseja excluir este jogo?')) {
            this.matches = this.matches.filter(match => match.id !== matchId);
            this.saveMatches();
            this.renderMatches();
            this.updateMatchSelects();
            this.showMessage('Jogo excluído com sucesso!', 'success');
        }
    }

    renderMatches() {
        const container = document.getElementById('matches-container');
        
        if (this.matches.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum jogo agendado ainda.</div>';
            return;
        }

        container.innerHTML = this.matches.map(match => {
            const dateTime = new Date(`${match.date}T${match.time}`).toLocaleString('pt-BR');
            const statusClass = match.status === 'completed' ? 'status-completed' : 'status-scheduled';
            const statusText = match.status === 'completed' ? 'Finalizado' : 'Agendado';
            
            // Indicador de ida/volta
            const legIndicator = match.leg ? `<span class="leg-indicator leg-${match.leg}">${match.leg.toUpperCase()}</span>` : '';
            
            return `
                <div class="match-card">
                    <div class="match-info">
                        <div class="match-teams">
                            ${match.team1.name} vs ${match.team2.name}
                            ${legIndicator}
                        </div>
                        <div class="match-details">
                            📅 ${dateTime} | 📍 ${match.location || 'Local não informado'}
                            <span class="status-badge ${statusClass}">${statusText}</span>
                            ${match.result ? `<div class="result-score">${match.result.team1Score} x ${match.result.team2Score}</div>` : ''}
                        </div>
                    </div>
                    <button class="btn-delete" onclick="championship.deleteMatch(${match.id})">
                        Excluir
                    </button>
                </div>
            `;
        }).join('');
    }

    updateMatchSelects() {
        const select = document.getElementById('result-match');
        const scheduledMatches = this.matches.filter(match => match.status === 'scheduled');
        
        select.innerHTML = '<option value="">Selecione um jogo</option>' +
            scheduledMatches.map(match => 
                `<option value="${match.id}">${match.team1.name} vs ${match.team2.name} - ${new Date(`${match.date}T${match.time}`).toLocaleString('pt-BR')}</option>`
            ).join('');
    }

    loadMatchForResult(matchId) {
        if (!matchId) return;
        
        const match = this.matches.find(m => m.id === parseInt(matchId));
        if (match) {
            document.getElementById('team1-name').textContent = match.team1.name;
            document.getElementById('team2-name').textContent = match.team2.name;
            document.getElementById('team1-score').value = '';
            document.getElementById('team2-score').value = '';
        }
    }

    saveResult() {
        const matchId = parseInt(document.getElementById('result-match').value);
        const team1Score = parseInt(document.getElementById('team1-score').value);
        const team2Score = parseInt(document.getElementById('team2-score').value);

        if (!matchId) {
            this.showMessage('Por favor, selecione um jogo.', 'error');
            return;
        }

        if (isNaN(team1Score) || isNaN(team2Score) || team1Score < 0 || team2Score < 0) {
            this.showMessage('Por favor, informe placares válidos.', 'error');
            return;
        }

        const match = this.matches.find(m => m.id === matchId);
        if (!match) return;

        match.result = {
            team1Score: team1Score,
            team2Score: team2Score
        };
        match.status = 'completed';

        // Atualizar estatísticas dos times
        this.updateTeamStats(match);
        
        this.saveMatches();
        this.saveTeams();
        this.renderMatches();
        this.renderResults();
        this.updateMatchSelects();
        this.updateClassificationTable();
        
        // Limpar formulário
        document.getElementById('result-match').value = '';
        document.getElementById('team1-score').value = '';
        document.getElementById('team2-score').value = '';
        document.getElementById('team1-name').textContent = 'Time 1';
        document.getElementById('team2-name').textContent = 'Time 2';
        
        this.showMessage('Resultado salvo com sucesso!', 'success');
    }

    updateTeamStats(match) {
        const team1 = this.teams.find(t => t.id === match.team1.id);
        const team2 = this.teams.find(t => t.id === match.team2.id);
        
        if (!team1 || !team2) return;

        const { team1Score, team2Score } = match.result;

        // Atualizar estatísticas do time 1
        team1.stats.matches++;
        team1.stats.goalsFor += team1Score;
        team1.stats.goalsAgainst += team2Score;
        
        // Atualizar estatísticas do time 2
        team2.stats.matches++;
        team2.stats.goalsFor += team2Score;
        team2.stats.goalsAgainst += team1Score;

        // Determinar resultado
        if (team1Score > team2Score) {
            team1.stats.wins++;
            team1.stats.points += 3;
            team2.stats.losses++;
        } else if (team2Score > team1Score) {
            team2.stats.wins++;
            team2.stats.points += 3;
            team1.stats.losses++;
        } else {
            team1.stats.draws++;
            team1.stats.points += 1;
            team2.stats.draws++;
            team2.stats.points += 1;
        }
    }

    renderResults() {
        const container = document.getElementById('results-container');
        const completedMatches = this.matches.filter(match => match.status === 'completed');
        
        if (completedMatches.length === 0) {
            container.innerHTML = '<div class="empty-state">Nenhum resultado registrado ainda.</div>';
            return;
        }

        container.innerHTML = completedMatches.map(match => {
            const dateTime = new Date(`${match.date}T${match.time}`).toLocaleString('pt-BR');
            
            // Indicador de ida/volta
            const legIndicator = match.leg ? `<span class="leg-indicator leg-${match.leg}">${match.leg.toUpperCase()}</span>` : '';
            
            return `
                <div class="result-card">
                    <div class="result-info">
                        <div class="match-teams">
                            ${match.team1.name} vs ${match.team2.name}
                            ${legIndicator}
                        </div>
                        <div class="result-score">${match.result.team1Score} x ${match.result.team2Score}</div>
                        <div class="match-details">📅 ${dateTime} | 📍 ${match.location || 'Local não informado'}</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    setupGroupsDistribution() {
        if (this.teams.length === 0) {
            this.showMessage('Cadastre os times primeiro antes de configurar os grupos.', 'error');
            return;
        }

        const numGroups = parseInt(document.getElementById('num-groups').value);
        if (!numGroups || numGroups < 1) {
            this.showMessage('Defina o número de grupos primeiro.', 'error');
            return;
        }

        // Inicializar grupos vazios
        this.config.groupsDistribution = [];
        for (let i = 0; i < numGroups; i++) {
            this.config.groupsDistribution.push({
                name: `Grupo ${String.fromCharCode(65 + i)}`,
                teams: []
            });
        }

        this.saveConfig();
        this.renderGroupsDistribution();
        document.getElementById('groups-distribution').style.display = 'block';
    }

    hideGroupsDistribution() {
        document.getElementById('groups-distribution').style.display = 'none';
        this.config.groupsDistribution = [];
    }

    renderGroupsDistribution() {
        const container = document.getElementById('groups-container');
        const availableTeams = this.teams.filter(team => 
            !this.config.groupsDistribution.some(group => 
                group.teams.some(t => t.id === team.id)
            )
        );

        let html = '<div class="groups-setup">';
        
        // Lista de times disponíveis
        html += '<div class="available-teams">';
        html += '<h4>Times Disponíveis</h4>';
        html += '<div class="teams-pool">';
        availableTeams.forEach(team => {
            html += `<div class="team-chip" draggable="true" data-team-id="${team.id}" ondragstart="championship.dragStart(event)">${team.name}</div>`;
        });
        html += '</div></div>';

        // Grupos
        html += '<div class="groups-grid">';
        this.config.groupsDistribution.forEach((group, groupIndex) => {
            html += `<div class="group-container" ondrop="championship.drop(event, ${groupIndex})" ondragover="championship.allowDrop(event)">`;
            html += `<h4>${group.name}</h4>`;
            html += '<div class="group-teams">';
            group.teams.forEach(team => {
                html += `<div class="team-chip in-group" data-team-id="${team.id}" draggable="true" ondragstart="championship.dragStart(event)">`;
                html += `${team.name} <button onclick="championship.removeFromGroup(${team.id}, ${groupIndex})" class="remove-btn">×</button>`;
                html += '</div>';
            });
            html += '</div></div>';
        });
        html += '</div></div>';

        container.innerHTML = html;
    }

    dragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.teamId);
    }

    allowDrop(event) {
        event.preventDefault();
    }

    drop(event, groupIndex) {
        event.preventDefault();
        const teamId = parseInt(event.dataTransfer.getData('text/plain'));
        const team = this.teams.find(t => t.id === teamId);
        
        if (team) {
            // Remover time de outros grupos
            this.config.groupsDistribution.forEach(group => {
                group.teams = group.teams.filter(t => t.id !== teamId);
            });
            
            // Adicionar ao grupo atual
            this.config.groupsDistribution[groupIndex].teams.push({
                id: team.id,
                name: team.name
            });
            
            this.saveConfig();
            this.renderGroupsDistribution();
            this.updateClassificationTable();
        }
    }

    removeFromGroup(teamId, groupIndex) {
        this.config.groupsDistribution[groupIndex].teams = 
            this.config.groupsDistribution[groupIndex].teams.filter(t => t.id !== teamId);
        this.saveConfig();
        this.renderGroupsDistribution();
        this.updateClassificationTable();
    }

    getTeamGroup(teamId) {
        if (!this.config.groupsDistribution) return null;
        
        for (let i = 0; i < this.config.groupsDistribution.length; i++) {
            const group = this.config.groupsDistribution[i];
            if (group.teams && group.teams.some(t => t.id === teamId)) {
                return i;
            }
        }
        return null;
    }

    updateClassificationTable() {
        const tbody = document.getElementById('table-body');
        const container = document.querySelector('.table-container');
        const originalTable = document.getElementById('classification-table');
        
        // Remover qualquer container de grupos existente
        const existingGroupsContainer = container.querySelector('.groups-tables-container');
        if (existingGroupsContainer) {
            existingGroupsContainer.remove();
        }
        
        // Mostrar a tabela original
        if (originalTable) {
            originalTable.style.display = 'table';
        }
        
        if (this.teams.length === 0) {
            tbody.innerHTML = '<tr><td colspan="10" class="empty-state">Nenhum time cadastrado ainda.</td></tr>';
            return;
        }

        // Se há distribuição de grupos, mostrar por grupos
        if (this.config.type === 'group' && this.config.groupsDistribution && this.config.groupsDistribution.length > 0) {
            this.renderGroupTables();
            return;
        }

        // Ordenar times por pontos, saldo de gols e gols pró
        const sortedTeams = [...this.teams].sort((a, b) => {
            if (b.stats.points !== a.stats.points) {
                return b.stats.points - a.stats.points;
            }
            const saldoA = a.stats.goalsFor - a.stats.goalsAgainst;
            const saldoB = b.stats.goalsFor - b.stats.goalsAgainst;
            if (saldoB !== saldoA) {
                return saldoB - saldoA;
            }
            return b.stats.goalsFor - a.stats.goalsFor;
        });

        tbody.innerHTML = sortedTeams.map((team, index) => {
            const saldo = team.stats.goalsFor - team.stats.goalsAgainst;
            return `
                <tr>
                    <td>${index + 1}</td>
                    <td style="text-align: left; font-weight: 600;">${team.name}</td>
                    <td>${team.stats.matches}</td>
                    <td>${team.stats.wins}</td>
                    <td>${team.stats.draws}</td>
                    <td>${team.stats.losses}</td>
                    <td>${team.stats.goalsFor}</td>
                    <td>${team.stats.goalsAgainst}</td>
                    <td>${saldo >= 0 ? '+' : ''}${saldo}</td>
                    <td style="font-weight: bold; color: #667eea;">${team.stats.points}</td>
                </tr>
            `;
        }).join('');
    }

    renderGroupTables() {
        const container = document.querySelector('.table-container');
        
        // Ocultar a tabela original
        const originalTable = document.getElementById('classification-table');
        if (originalTable) {
            originalTable.style.display = 'none';
        }
        
        // Remover qualquer container de grupos existente
        const existingGroupsContainer = container.querySelector('.groups-tables-container');
        if (existingGroupsContainer) {
            existingGroupsContainer.remove();
        }
        
        let html = '<div class="groups-tables-container">';
        
        // Mostrar todos os grupos, mesmo os vazios
        this.config.groupsDistribution.forEach((group, groupIndex) => {
            const groupTeams = (group.teams || []).map(gt => 
                this.teams.find(t => t.id === gt.id)
            ).filter(t => t);
            
            const sortedGroupTeams = groupTeams.sort((a, b) => {
                if (b.stats.points !== a.stats.points) {
                    return b.stats.points - a.stats.points;
                }
                const saldoA = a.stats.goalsFor - a.stats.goalsAgainst;
                const saldoB = b.stats.goalsFor - b.stats.goalsAgainst;
                if (saldoB !== saldoA) {
                    return saldoB - saldoA;
                }
                return b.stats.goalsFor - a.stats.goalsFor;
            });
            
            html += `<div class="group-table">`;
            html += `<div class="group-header">`;
            html += `<h3>Grupo ${String.fromCharCode(65 + groupIndex)}</h3>`;
            html += `<span class="team-count">⚽ ${groupTeams.length} time${groupTeams.length !== 1 ? 's' : ''}</span>`;
            html += `</div>`;
            
            if (groupTeams.length === 0) {
                html += `<div class="empty-group">Nenhum time neste grupo</div>`;
            } else {
                html += `<table class="classification-table">`;
                html += `<thead><tr>`;
                html += `<th title="Posição">📍 Pos</th>`;
                html += `<th title="Nome do Time">👕 Time</th>`;
                html += `<th title="Jogos">🎮 J</th>`;
                html += `<th title="Vitórias">🏆 V</th>`;
                html += `<th title="Empates">🤝 E</th>`;
                html += `<th title="Derrotas">❌ D</th>`;
                html += `<th title="Gols Pró">⚽ GP</th>`;
                html += `<th title="Gols Contra">🥅 GC</th>`;
                html += `<th title="Saldo de Gols">📊 SG</th>`;
                html += `<th title="Pontos">💎 Pts</th>`;
                html += `</tr></thead>`;
                html += '<tbody>';
                
                sortedGroupTeams.forEach((team, index) => {
                    const saldo = team.stats.goalsFor - team.stats.goalsAgainst;
                    const position = index + 1;
                    const positionIcon = position === 1 ? '🥇' : position === 2 ? '🥈' : position === 3 ? '🥉' : position;
                    
                    html += `<tr class="team-row" data-position="${position}">`;
                    html += `<td class="position-cell">${positionIcon}</td>`;
                    html += `<td class="team-name-cell">${team.name}</td>`;
                    html += `<td class="stat-cell">${team.stats.matches}</td>`;
                    html += `<td class="stat-cell wins">${team.stats.wins}</td>`;
                    html += `<td class="stat-cell draws">${team.stats.draws}</td>`;
                    html += `<td class="stat-cell losses">${team.stats.losses}</td>`;
                    html += `<td class="stat-cell goals-for">${team.stats.goalsFor}</td>`;
                    html += `<td class="stat-cell goals-against">${team.stats.goalsAgainst}</td>`;
                    html += `<td class="stat-cell saldo ${saldo >= 0 ? 'positive' : 'negative'}">${saldo >= 0 ? '+' : ''}${saldo}</td>`;
                    html += `<td class="points-cell">${team.stats.points}</td>`;
                    html += '</tr>';
                });
                
                html += '</tbody></table>';
            }
            html += '</div>';
        });
        
        html += '</div>';
        
        // Adicionar o novo conteúdo
        container.insertAdjacentHTML('beforeend', html);
    }

    saveTeams() {
        localStorage.setItem('teams', JSON.stringify(this.teams));
    }

    saveMatches() {
        localStorage.setItem('matches', JSON.stringify(this.matches));
    }

    showMessage(message, type) {
        // Criar elemento de mensagem
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;
        
        // Estilos da mensagem
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 1000;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: #48bb78;' : 'background: #e53e3e;'}
        `;
        
        document.body.appendChild(messageDiv);
        
        // Remover mensagem após 3 segundos
        setTimeout(() => {
            messageDiv.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => {
                document.body.removeChild(messageDiv);
            }, 300);
        }, 3000);
    }
}

// Adicionar animações CSS
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Inicializar aplicação
const championship = new ChampionshipManager();

// Função global para deletar times (chamada pelos botões)
window.championship = championship;