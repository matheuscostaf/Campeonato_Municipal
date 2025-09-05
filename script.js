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
    }

    setupEventListeners() {
        // Navegação
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchSection(e.target.dataset.section);
            });
        });

        // Configuração
        document.getElementById('tournament-type').addEventListener('change', (e) => {
            this.toggleConfigSections(e.target.value);
        });
        document.getElementById('save-config').addEventListener('click', () => {
            this.saveConfig();
        });
        document.getElementById('setup-groups').addEventListener('click', () => {
            this.setupGroupsDistribution();
        });
        document.getElementById('num-groups').addEventListener('change', () => {
            this.hideGroupsDistribution();
        });

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

    toggleConfigSections(type) {
        const groupConfig = document.getElementById('group-config');
        const eliminationConfig = document.getElementById('elimination-config');

        if (type === 'group' || type === 'mixed') {
            groupConfig.style.display = 'block';
        } else {
            groupConfig.style.display = 'none';
        }

        if (type === 'elimination' || type === 'mixed') {
            eliminationConfig.style.display = 'block';
        } else {
            eliminationConfig.style.display = 'none';
        }
    }

    saveConfig() {
        this.config = {
            name: document.getElementById('championship-name').value,
            type: document.getElementById('tournament-type').value,
            numGroups: parseInt(document.getElementById('num-groups').value),
            groupsDistribution: this.config.groupsDistribution || [],
            eliminationType: document.getElementById('elimination-type').value
        };

        localStorage.setItem('config', JSON.stringify(this.config));
        this.showMessage('Configuração salva com sucesso!', 'success');
    }

    loadConfig() {
        document.getElementById('championship-name').value = this.config.name;
        document.getElementById('tournament-type').value = this.config.type;
        document.getElementById('num-groups').value = this.config.numGroups;
        document.getElementById('elimination-type').value = this.config.eliminationType;
        
        this.toggleConfigSections(this.config.type);
        
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

        const match = {
            id: Date.now(),
            team1: { id: team1Id, name: team1.name },
            team2: { id: team2Id, name: team2.name },
            date: date,
            time: time,
            location: location,
            status: 'scheduled',
            result: null
        };

        this.matches.push(match);
        this.saveMatches();
        this.renderMatches();
        this.updateMatchSelects();
        
        // Limpar formulário
        document.getElementById('match-team1').value = '';
        document.getElementById('match-team2').value = '';
        document.getElementById('match-date').value = '';
        document.getElementById('match-time').value = '';
        document.getElementById('match-location').value = '';
        
        this.showMessage('Jogo agendado com sucesso!', 'success');
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
            
            return `
                <div class="match-card">
                    <div class="match-info">
                        <div class="match-teams">${match.team1.name} vs ${match.team2.name}</div>
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
            
            return `
                <div class="result-card">
                    <div class="result-info">
                        <div class="match-teams">${match.team1.name} vs ${match.team2.name}</div>
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