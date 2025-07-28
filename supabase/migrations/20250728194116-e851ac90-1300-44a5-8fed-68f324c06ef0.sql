-- Criar função que atualiza o click_count quando um clique é registrado
CREATE OR REPLACE FUNCTION update_link_click_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Apenas atualizar se for um evento de clique e tiver link_id
    IF NEW.event_type = 'click' AND NEW.link_id IS NOT NULL THEN
        UPDATE links 
        SET click_count = click_count + 1
        WHERE id = NEW.link_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger para automaticamente atualizar click_count
CREATE TRIGGER trigger_update_link_click_count
    AFTER INSERT ON analytics
    FOR EACH ROW
    EXECUTE FUNCTION update_link_click_count();

-- Sincronizar dados existentes: atualizar click_count baseado nos dados já existentes
UPDATE links 
SET click_count = (
    SELECT COUNT(*) 
    FROM analytics 
    WHERE analytics.link_id = links.id 
    AND analytics.event_type = 'click'
);